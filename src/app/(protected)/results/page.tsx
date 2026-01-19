import { db } from "@/lib/db";
import {
  type Employee as PricingEmployee,
  type OverheadType,
  type Settings,
  type Breakdown,
  getExchangeRatio,
  calculateFinalPrice,
} from "@/lib/pricing";
import {
  computeGlobalQaAddOnPerReleaseHr,
  computeGlobalBaAddOnPerReleaseHr,
} from "@/lib/dashboard";
import { calculatePricingWithBreakdowns } from "@/lib/pricing";
import { ResultsTables } from "./ResultsTables";
import { Prisma } from "@prisma/client";
import { ResultsActions } from "./ResultsActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { formatMoney, formatPercent, formatNumber, type Currency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ViewSelector } from "@/components/ViewSelector";
import {
  getEmployeeOverrides,
  getOverheadTypeOverrides,
  computeEffectiveEmployeeActive,
  computeEffectiveOverheadTypeActive,
} from "@/lib/views";
import { getEffectiveSettings } from "@/lib/effective-settings";
import { getEffectiveOverheadAllocs } from "@/lib/effective-allocations";

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
    orderBy: { name: "asc" },
  });
  return types.map((type) => ({
    id: type.id,
    name: type.name,
    amount: Number(type.amount),
    period: type.period as "annual" | "monthly" | "quarterly",
  }));
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
  effectiveAllocations: Array<{ overheadTypeId: string; share: number }> | undefined
): PricingEmployee {
  // Use effective allocations if provided, otherwise use base allocations
  const allocations = effectiveAllocations || emp.overheadAllocs.map((alloc) => ({
    overheadTypeId: alloc.overheadTypeId,
    share: alloc.share,
  }));

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
    overheadAllocs: allocations,
  };
}


export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const viewId = params.view && params.view !== "__base__" ? params.view : null;

  const techStacks = await getTechStacks();
  const employeesRaw = await getEmployees();
  const overheadTypesRaw = await getOverheadTypes();
  // Use effective settings (global + view overrides)
  const settings = await getEffectiveSettings(viewId);

  // Fetch view overrides if viewId is provided
  const employeeOverrides = viewId ? await getEmployeeOverrides(viewId) : new Map();
  const overheadTypeOverrides = viewId ? await getOverheadTypeOverrides(viewId) : new Map();

  // Get all overhead types from DB to check base active status
  const allOverheadTypes = await db.overheadType.findMany({
    orderBy: { name: "asc" },
  });

  // Compute effective active status
  const employeesWithEffective = employeesRaw.map((emp) => {
    const override = employeeOverrides.get(emp.id) || null;
    const effective = computeEffectiveEmployeeActive(emp.isActive, override);
    return { ...emp, effectiveIsActive: effective.isActive };
  });

  const overheadTypesWithEffective = overheadTypesRaw.map((type) => {
    const dbType = allOverheadTypes.find((t) => t.id === type.id);
    if (!dbType) return { ...type, effectiveIsActive: false };
    const override = overheadTypeOverrides.get(type.id) || null;
    const effective = computeEffectiveOverheadTypeActive(dbType.isActive, override);
    return { ...type, effectiveIsActive: effective.isActive };
  });

  // Get effective allocations for all employees
  const effectiveEmployeeActiveMap = new Map(
    employeesWithEffective.map((e) => [e.id, e.effectiveIsActive])
  );
  const effectiveOverheadTypeActiveMap = new Map(
    overheadTypesWithEffective.map((t) => [t.id, t.effectiveIsActive])
  );
  const effectiveAllocationsMap = await getEffectiveOverheadAllocs(
    viewId,
    employeesRaw.map((emp) => ({
      id: emp.id,
      name: emp.name,
      category: emp.category,
      techStackId: emp.techStackId,
      grossMonthly: Number(emp.grossMonthly),
      netMonthly: Number(emp.netMonthly),
      oncostRate: emp.oncostRate,
      annualBenefits: emp.annualBenefits ? Number(emp.annualBenefits) : null,
      annualBonus: emp.annualBonus ? Number(emp.annualBonus) : null,
      fte: emp.fte,
      isActive: emp.isActive,
      overheadAllocs: emp.overheadAllocs.map((alloc) => ({
        overheadTypeId: alloc.overheadTypeId,
        share: alloc.share,
      })),
    })),
    overheadTypesRaw,
    effectiveEmployeeActiveMap,
    effectiveOverheadTypeActiveMap
  );

  // Filter to effective active employees and effective active overhead types
  const activeEmployeesRaw = employeesWithEffective.filter((e) => e.effectiveIsActive);
  const activeOverheadTypes = overheadTypesWithEffective.filter((t) => t.effectiveIsActive);
  const pricingEmployees = activeEmployeesRaw.map((emp) => {
    const effectiveAllocs = effectiveAllocationsMap.get(emp.id) || [];
    return convertEmployee(emp, effectiveAllocs);
  });

  // Count inactive items for warnings (using effective status)
  const inactiveEmployeeCount = employeesWithEffective.filter((e) => !e.effectiveIsActive).length;
  const inactiveOverheadCount = overheadTypesWithEffective.filter((t) => !t.effectiveIsActive).length;

  // Fetch views for selector (with error handling in case Prisma Client is stale)
  let views: Array<{ id: string; name: string }> = [];
  try {
    views = await db.pricingView.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  } catch (error) {
    // If pricingView doesn't exist yet (stale Prisma Client), return empty array
    console.warn("Could not fetch views:", error);
    views = [];
  }

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

  if (activeOverheadTypes.length === 0 || missingSettings.length > 0) {
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
            {activeOverheadTypes.length === 0 && "Overhead Types"}
            {activeOverheadTypes.length === 0 && missingSettings.length > 0 && " and "}
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
  const qaAddOn = computeGlobalQaAddOnPerReleaseHr(qaEmployees, activeOverheadTypes, settings);
  const baAddOn = computeGlobalBaAddOnPerReleaseHr(baEmployees, activeOverheadTypes, settings);

  // Calculate breakdowns for each stack
  const devBreakdowns = new Map<string, Map<string, Breakdown>>();
  const agenticBreakdowns = new Map<string, Map<string, Breakdown>>();

  // Calculate DEV breakdowns
  for (const stack of techStacks) {
    const stackDevs = devByStack.get(stack.id) || [];
    if (stackDevs.length > 0) {
      const { breakdowns } = calculatePricingWithBreakdowns(
        "DEV",
        stack.id,
        pricingEmployees,
        activeOverheadTypes,
        settings
      );
      devBreakdowns.set(stack.id, breakdowns);
    }
  }

  // Calculate AGENTIC_AI breakdowns
  for (const stack of techStacks) {
    const stackAgenticAi = agenticAiByStack.get(stack.id) || [];
    if (stackAgenticAi.length > 0) {
      const { breakdowns } = calculatePricingWithBreakdowns(
        "AGENTIC_AI",
        stack.id,
        pricingEmployees,
        activeOverheadTypes,
        settings
      );
      agenticBreakdowns.set(stack.id, breakdowns);
    }
  }

  // Calculate QA/BA add-on breakdowns (global, not per stack)
  // We need to calculate these separately since they're global, not per-stack
  // Use any stack with DEV employees to get the breakdowns (they're the same for all stacks)
  let qaAddOnBreakdown: Breakdown | null = null;
  let baAddOnBreakdown: Breakdown | null = null;
  
  // Find a stack with DEV employees to calculate QA/BA breakdowns
  const stackWithDev = techStacks.find((stack) => {
    const stackDevs = devByStack.get(stack.id) || [];
    return stackDevs.length > 0;
  });
  
  if (stackWithDev && qaEmployees.length > 0) {
    const tempResult = calculatePricingWithBreakdowns(
      "DEV",
      stackWithDev.id,
      pricingEmployees,
      activeOverheadTypes,
      settings
    );
    qaAddOnBreakdown = tempResult.breakdowns.get("qa_addon_hr") ?? null;
  }
  
  if (stackWithDev && baEmployees.length > 0) {
    const tempResult = calculatePricingWithBreakdowns(
      "DEV",
      stackWithDev.id,
      pricingEmployees,
      activeOverheadTypes,
      settings
    );
    baAddOnBreakdown = tempResult.breakdowns.get("ba_addon_hr") ?? null;
  }

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
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Pricing Results</h1>
          <ViewSelector views={views} />
        </div>
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

        <ResultsTables
          techStacks={techStacks}
          devByStack={devByStack}
          agenticAiByStack={agenticAiByStack}
          activeOverheadTypes={activeOverheadTypes}
          pricingEmployees={pricingEmployees}
          settings={settings}
          currency={currency}
          devBreakdowns={devBreakdowns}
          agenticBreakdowns={agenticBreakdowns}
          qaAddOnTotal={qaAddOn.total}
          baAddOnTotal={baAddOn.total}
          qaAddOnBreakdown={qaAddOnBreakdown}
          baAddOnBreakdown={baAddOnBreakdown}
        />
      </div>
    </>
  );
}
