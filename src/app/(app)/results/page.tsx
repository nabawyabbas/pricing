import { db } from "@/lib/db";
import {
  type Employee as PricingEmployee,
  type OverheadType,
  type Settings,
  getExchangeRatio,
  calculateFinalPrice,
} from "@/lib/pricing";
import {
  computeDevStackRow,
  computeAgenticStackRow,
  computeGlobalQaAddOnPerReleaseHr,
  computeGlobalBaAddOnPerReleaseHr,
  getOverheadAllocationSum,
  isAllocationValid,
} from "@/lib/dashboard";
import { Prisma } from "@prisma/client";
import { ResultsActions } from "./ResultsActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle } from "lucide-react";
import { formatMoney, formatPercent, formatNumber, formatPct, type Currency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

async function getTechStacks() {
  return await db.techStack.findMany({
    orderBy: { name: "asc" },
  });
}

async function getEmployees() {
  return await db.employee.findMany({
    include: {
      techStack: true,
      overheadAllocs: {
        include: {
          overheadType: true,
        },
      },
    },
  });
}

async function getOverheadTypes(): Promise<OverheadType[]> {
  const types = await db.overheadType.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return types.map((type) => ({
    id: type.id,
    name: type.name,
    amount: Number(type.amount),
    period: type.period as "annual" | "monthly" | "quarterly",
  }));
}

async function getSettings(): Promise<Settings> {
  const settings = await db.setting.findMany();
  const settingsMap: Settings = {};
  settings.forEach((setting) => {
    // Parse value based on type
    if (setting.valueType === "float" || setting.valueType === "number") {
      settingsMap[setting.key] = Number.parseFloat(setting.value);
    } else if (setting.valueType === "integer") {
      settingsMap[setting.key] = Number.parseInt(setting.value, 10);
    } else if (setting.valueType === "boolean") {
      settingsMap[setting.key] = setting.value === "true" ? 1 : 0;
    } else {
      // For string, try to parse as number, fallback to 0
      const parsed = Number.parseFloat(setting.value);
      settingsMap[setting.key] = isNaN(parsed) ? 0 : parsed;
    }
  });
  return settingsMap;
}

function convertEmployee(
  emp: {
    id: string;
    name: string;
    category: string;
    techStackId: string | null;
    grossMonthly: Prisma.Decimal;
    netMonthly: Prisma.Decimal;
    oncostRate: number | null;
    annualBenefits: Prisma.Decimal | null;
    annualBonus: Prisma.Decimal | null;
    fte: number;
    isActive: boolean;
    overheadAllocs: Array<{
      overheadTypeId: string;
      share: number;
      overheadType: {
        isActive: boolean;
      };
    }>;
  },
  activeOverheadTypeIds: Set<string>
): PricingEmployee {
  // Filter allocations to only include those where overheadType is active
  const activeAllocs = emp.overheadAllocs.filter(
    (alloc) => activeOverheadTypeIds.has(alloc.overheadTypeId)
  );

  return {
    id: emp.id,
    name: emp.name,
    category: emp.category as "DEV" | "QA" | "BA" | "AGENTIC_AI",
    techStackId: emp.techStackId,
    grossMonthly: Number(emp.grossMonthly),
    netMonthly: Number(emp.netMonthly),
    oncostRate: emp.oncostRate,
    annualBenefits: emp.annualBenefits ? Number(emp.annualBenefits) : null,
    annualBonus: emp.annualBonus ? Number(emp.annualBonus) : null,
    fte: emp.fte,
    overheadAllocs: activeAllocs.map((alloc) => ({
      overheadTypeId: alloc.overheadTypeId,
      share: alloc.share,
    })),
  };
}


export default async function ResultsPage() {
  const techStacks = await getTechStacks();
  const employeesRaw = await getEmployees();
  const overheadTypes = await getOverheadTypes();
  const settings = await getSettings();

  // Get active overhead type IDs
  const activeOverheadTypeIds = new Set(overheadTypes.map((t) => t.id));

  // Filter to active employees only
  const activeEmployeesRaw = employeesRaw.filter((e) => e.isActive);
  const pricingEmployees = activeEmployeesRaw.map((emp) => convertEmployee(emp, activeOverheadTypeIds));

  // Count inactive items for warnings
  const inactiveEmployeeCount = employeesRaw.filter((e) => !e.isActive).length;
  const allOverheadTypes = await db.overheadType.findMany();
  const inactiveOverheadCount = allOverheadTypes.filter((t) => !t.isActive).length;

  // Check if required settings exist
  const requiredSettings = [
    "dev_releasable_hours_per_month",
    "standard_hours_per_month",
    "qa_ratio",
    "ba_ratio",
    "margin",
    "risk",
  ];
  const missingSettings = requiredSettings.filter((key) => settings[key] === undefined);

  if (overheadTypes.length === 0 || missingSettings.length > 0) {
    return (
      <Card className="border-yellow-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-600">
            <AlertCircle className="h-5 w-5" />
            Configuration Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            Please configure{" "}
            {overheadTypes.length === 0 && "Overhead Types"}
            {overheadTypes.length === 0 && missingSettings.length > 0 && " and "}
            {missingSettings.length > 0 && `Settings (missing: ${missingSettings.join(", ")})`}
            {" "}before viewing results.
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  const exchangeRatio = getExchangeRatio(settings);
  const currency: Currency = exchangeRatio && exchangeRatio > 0 ? "USD" : "EGP";

  // Group employees by category and stack
  const devByStack = new Map<string, PricingEmployee[]>();
  const agenticAiByStack = new Map<string, PricingEmployee[]>();
  const qaEmployees = pricingEmployees.filter((emp) => emp.category === "QA");
  const baEmployees = pricingEmployees.filter((emp) => emp.category === "BA");

  pricingEmployees.forEach((emp) => {
    if (emp.category === "DEV" && emp.techStackId) {
      if (!devByStack.has(emp.techStackId)) {
        devByStack.set(emp.techStackId, []);
      }
      devByStack.get(emp.techStackId)!.push(emp);
    } else if (emp.category === "AGENTIC_AI" && emp.techStackId) {
      if (!agenticAiByStack.has(emp.techStackId)) {
        agenticAiByStack.set(emp.techStackId, []);
      }
      agenticAiByStack.get(emp.techStackId)!.push(emp);
    }
  });

  // Compute global QA/BA add-ons once
  const qaAddOn = computeGlobalQaAddOnPerReleaseHr(qaEmployees, overheadTypes, settings);
  const baAddOn = computeGlobalBaAddOnPerReleaseHr(baEmployees, overheadTypes, settings);

  // Get settings with defaults and track missing ones
  // Defaults: 100/160/0.5/0.25/0/0 (dev hours/standard hours/qa ratio/ba ratio/margin/risk)
  const devReleasableHours = settings.dev_releasable_hours_per_month ?? 100;
  const standardHours = settings.standard_hours_per_month ?? 160;
  const qaRatio = settings.qa_ratio ?? 0.5;
  const baRatio = settings.ba_ratio ?? 0.25;
  const margin = settings.margin ?? 0;
  const risk = settings.risk ?? 0;

  const missingSettingsList: string[] = [];
  if (settings.dev_releasable_hours_per_month === undefined) missingSettingsList.push("dev_releasable_hours_per_month");
  if (settings.standard_hours_per_month === undefined) missingSettingsList.push("standard_hours_per_month");
  if (settings.qa_ratio === undefined) missingSettingsList.push("qa_ratio");
  if (settings.ba_ratio === undefined) missingSettingsList.push("ba_ratio");
  if (settings.margin === undefined) missingSettingsList.push("margin");
  if (settings.risk === undefined) missingSettingsList.push("risk");

  const combinedMultiplier = (1 + margin) * (1 + risk);

  return (
    <>
      <ResultsActions settings={settings} />
      <div className="space-y-6">
        {/* Results Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Results Summary</CardTitle>
              {missingSettingsList.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Using defaults for {missingSettingsList.length} missing setting(s)
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Assumptions */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Assumptions
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Dev Releasable Hours/Month</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatNumber(devReleasableHours, 0)}</span>
                      {settings.dev_releasable_hours_per_month === undefined && (
                        <Badge variant="outline" className="text-xs">Default</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Standard Hours/Month</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatNumber(standardHours, 0)}</span>
                      {settings.standard_hours_per_month === undefined && (
                        <Badge variant="outline" className="text-xs">Default</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">QA Ratio</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatPercent(qaRatio, "decimal")}</span>
                      {settings.qa_ratio === undefined && (
                        <Badge variant="outline" className="text-xs">Default</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">BA Ratio</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatPercent(baRatio, "decimal")}</span>
                      {settings.ba_ratio === undefined && (
                        <Badge variant="outline" className="text-xs">Default</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Global Add-ons */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Global Add-ons (per releaseable hr)
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">QA Add-on/hr</span>
                    <span className="font-medium">{formatMoney(qaAddOn.total, currency)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">BA Add-on/hr</span>
                    <span className="font-medium">{formatMoney(baAddOn.total, currency)}</span>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Pricing
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Margin</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatPercent(margin, "decimal")}</span>
                      {settings.margin === undefined && (
                        <Badge variant="outline" className="text-xs">Default</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Risk</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatPercent(risk, "decimal")}</span>
                      {settings.risk === undefined && (
                        <Badge variant="outline" className="text-xs">Default</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-medium">Combined Multiplier</span>
                    <span className="font-semibold text-primary">{formatNumber(combinedMultiplier, 4)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inactive Items Note */}
        {(inactiveEmployeeCount > 0 || inactiveOverheadCount > 0) && (
          <Card className="border-muted">
            <CardContent className="pt-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <strong>Note:</strong> Inactive employees/overheads excluded from calculations.{" "}
                  {inactiveEmployeeCount > 0 && `${inactiveEmployeeCount} inactive employee(s)`}
                  {inactiveEmployeeCount > 0 && inactiveOverheadCount > 0 && " and "}
                  {inactiveOverheadCount > 0 && `${inactiveOverheadCount} inactive overhead type(s)`}
                  {" "}are excluded.
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* DEV Pricing Table */}
        <Card>
          <CardHeader>
            <CardTitle>DEV Pricing (per releaseable hour)</CardTitle>
          </CardHeader>
          <CardContent>
            {overheadTypes.length === 0 ? (
              <p className="text-muted-foreground italic">No active overhead types found.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10">Stack</TableHead>
                      <TableHead className="text-right">Raw Cost/hr</TableHead>
                      {overheadTypes.map((type) => {
                        const allocationSum = getOverheadAllocationSum(type.id, pricingEmployees);
                        const isValid = isAllocationValid(allocationSum);
                        return (
                          <TableHead key={type.id} className="text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-medium">{type.name}</span>
                              {!isValid && (
                                <span className="text-xs text-destructive">⚠️ {formatPercent(allocationSum, "decimal")}</span>
                              )}
                            </div>
                          </TableHead>
                        );
                      })}
                      <TableHead className="text-right font-semibold">Total Overheads/hr</TableHead>
                      <TableHead className="text-right font-semibold">QA Add-on/hr</TableHead>
                      <TableHead className="text-right font-semibold">BA Add-on/hr</TableHead>
                      <TableHead className="text-right font-semibold">Total Releaseable Cost/hr</TableHead>
                      <TableHead className="text-right font-semibold">Final Price/hr</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {techStacks.map((stack) => {
                      const stackDevs = devByStack.get(stack.id) || [];
                      const rowData = computeDevStackRow(
                        stack.id,
                        stackDevs,
                        overheadTypes,
                        qaAddOn.total,
                        baAddOn.total,
                        settings
                      );

                      if (!rowData) {
                        return null;
                      }

                      const totalReleaseableCost = rowData.totalReleaseableCost;
                      const finalPrice = totalReleaseableCost !== null
                        ? calculateFinalPrice(totalReleaseableCost, settings)
                        : null;

                      // Calculate percentages for each component
                      const calculatePct = (component: number | null): number | null => {
                        if (totalReleaseableCost === null || totalReleaseableCost === 0 || component === null) {
                          return null;
                        }
                        return (component / totalReleaseableCost) * 100;
                      };

                      return (
                        <TableRow key={stack.id}>
                          <TableCell className="sticky left-0 bg-background z-10 font-medium">{stack.name}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <span>{rowData.rawCost !== null ? formatMoney(rowData.rawCost, currency) : "—"}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatPct(calculatePct(rowData.rawCost))}
                              </span>
                            </div>
                          </TableCell>
                          {rowData.overheads.map((overhead, ohIdx) => (
                            <TableCell key={overheadTypes[ohIdx].id} className="text-right">
                              <div className="flex flex-col items-end">
                                <span>{overhead !== null ? formatMoney(overhead, currency) : "—"}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatPct(calculatePct(overhead))}
                                </span>
                              </div>
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-semibold">
                            <div className="flex flex-col items-end">
                              <span>{formatMoney(rowData.totalOverheads, currency)}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatPct(calculatePct(rowData.totalOverheads))}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            <div className="flex flex-col items-end">
                              <span>{formatMoney(rowData.qaAddOn, currency)}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatPct(calculatePct(rowData.qaAddOn))}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            <div className="flex flex-col items-end">
                              <span>{formatMoney(rowData.baAddOn, currency)}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatPct(calculatePct(rowData.baAddOn))}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {totalReleaseableCost !== null
                              ? formatMoney(totalReleaseableCost, currency)
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {finalPrice !== null ? formatMoney(finalPrice, currency) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AGENTIC_AI Pricing Table */}
        {agenticAiByStack.size > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>AGENTIC_AI Pricing (per releaseable hour)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10">Stack</TableHead>
                      <TableHead className="text-right">Raw Cost/hr</TableHead>
                      {overheadTypes.map((type) => {
                        const allocationSum = getOverheadAllocationSum(type.id, pricingEmployees);
                        const isValid = isAllocationValid(allocationSum);
                        return (
                          <TableHead key={type.id} className="text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-medium">{type.name}</span>
                              {!isValid && (
                                <span className="text-xs text-destructive">⚠️ {formatPercent(allocationSum, "decimal")}</span>
                              )}
                            </div>
                          </TableHead>
                        );
                      })}
                      <TableHead className="text-right font-semibold">Total Overheads/hr</TableHead>
                      <TableHead className="text-right font-semibold">Total Releaseable Cost/hr</TableHead>
                      <TableHead className="text-right font-semibold">Final Price/hr</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {techStacks.map((stack) => {
                      const stackAgenticAi = agenticAiByStack.get(stack.id) || [];
                      const rowData = computeAgenticStackRow(
                        stack.id,
                        stackAgenticAi,
                        overheadTypes,
                        settings
                      );

                      if (!rowData) {
                        return null;
                      }

                      const totalReleaseableCost = rowData.totalReleaseableCost;
                      const finalPrice = totalReleaseableCost !== null
                        ? calculateFinalPrice(totalReleaseableCost, settings)
                        : null;

                      // Calculate percentages for each component
                      const calculatePct = (component: number | null): number | null => {
                        if (totalReleaseableCost === null || totalReleaseableCost === 0 || component === null) {
                          return null;
                        }
                        return (component / totalReleaseableCost) * 100;
                      };

                      return (
                        <TableRow key={stack.id}>
                          <TableCell className="sticky left-0 bg-background z-10 font-medium">{stack.name}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <span>{rowData.rawCost !== null ? formatMoney(rowData.rawCost, currency) : "—"}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatPct(calculatePct(rowData.rawCost))}
                              </span>
                            </div>
                          </TableCell>
                          {rowData.overheads.map((overhead, ohIdx) => (
                            <TableCell key={overheadTypes[ohIdx].id} className="text-right">
                              <div className="flex flex-col items-end">
                                <span>{overhead !== null ? formatMoney(overhead, currency) : "—"}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatPct(calculatePct(overhead))}
                                </span>
                              </div>
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-semibold">
                            <div className="flex flex-col items-end">
                              <span>{formatMoney(rowData.totalOverheads, currency)}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatPct(calculatePct(rowData.totalOverheads))}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {totalReleaseableCost !== null
                              ? formatMoney(totalReleaseableCost, currency)
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {finalPrice !== null ? formatMoney(finalPrice, currency) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
