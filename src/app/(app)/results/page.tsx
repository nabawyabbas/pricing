import { db } from "@/lib/db";
import {
  calculatePricing,
  calculateQaCostPerDevRelHour,
  calculateBaCostPerDevRelHour,
  type Employee as PricingEmployee,
  type OverheadType,
  type Settings,
  getExchangeRatio,
} from "@/lib/pricing";
import { Prisma } from "@prisma/client";
import { ExplainSection } from "./ExplainSection";
import { ResultsTable } from "./ResultsTable";
import { ResultsActions } from "./ResultsActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { formatMoney, type Currency } from "@/lib/format";

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
    category: emp.category as "DEV" | "QA" | "BA",
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

  // Calculate QA and BA costs (shared across all stacks) - only active employees
  const qaEmployees = pricingEmployees.filter((emp) => emp.category === "QA");
  const baEmployees = pricingEmployees.filter((emp) => emp.category === "BA");

  const qaCostPerDevRelHour = calculateQaCostPerDevRelHour(
    qaEmployees,
    overheadTypes,
    settings
  );
  const baCostPerDevRelHour = calculateBaCostPerDevRelHour(
    baEmployees,
    overheadTypes,
    settings
  );

  // Calculate pricing for each tech stack - only active employees
  const stackResults = techStacks.map((stack) => {
    const result = calculatePricing(stack.id, pricingEmployees, overheadTypes, settings);
    return {
      stack,
      result,
    };
  });

  return (
    <>
      <ResultsActions settings={settings} />
      <div className="space-y-6">
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

        {/* QA and BA Costs Section */}
        <Card>
          <CardHeader>
            <CardTitle>Shared Costs {currency && `(${currency})`}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-muted-foreground mb-2">
                  QA Cost per Dev Releaseable Hour
                </div>
                <div className="text-2xl font-semibold">
                  {formatMoney(qaCostPerDevRelHour, currency)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">
                  BA Cost per Dev Releaseable Hour
                </div>
                <div className="text-2xl font-semibold">
                  {formatMoney(baCostPerDevRelHour, currency)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <ResultsTable
          stackResults={stackResults}
          qaCostPerDevRelHour={qaCostPerDevRelHour}
          baCostPerDevRelHour={baCostPerDevRelHour}
          settings={settings}
          currency={currency}
        />

        {/* Tech Stack Details with Explain Sections */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Per Tech Stack Details</h2>
          {stackResults.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground italic">
                  No tech stacks found. Create tech stacks and assign DEV employees to view results.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {stackResults.map(({ stack, result }) => (
                <StackResultCard
                  key={stack.id}
                  stackName={stack.name}
                  stackId={stack.id}
                  result={result}
                  employees={pricingEmployees}
                  overheadTypes={overheadTypes}
                  settings={settings}
                  qaCostPerDevRelHour={qaCostPerDevRelHour}
                  baCostPerDevRelHour={baCostPerDevRelHour}
                  currency={currency}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function StackResultCard({
  stackName,
  stackId,
  result,
  employees,
  overheadTypes,
  settings,
  qaCostPerDevRelHour,
  baCostPerDevRelHour,
  currency,
}: {
  stackName: string;
  stackId: string;
  result: {
    devCostPerRelHour: number | null;
    qaCostPerDevRelHour: number;
    baCostPerDevRelHour: number;
    releaseableCost: number | null;
    finalPrice: number | null;
  };
  employees: PricingEmployee[];
  overheadTypes: OverheadType[];
  settings: Settings;
  qaCostPerDevRelHour: number;
  baCostPerDevRelHour: number;
  currency: Currency;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{stackName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {result.devCostPerRelHour === null ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
            No active DEV employees assigned to this tech stack.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Dev Cost per Releaseable Hour
                </div>
                <div className="text-xl font-semibold">
                  {formatMoney(result.devCostPerRelHour, currency)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Releaseable Cost
                </div>
                <div className="text-xl font-semibold">
                  {formatMoney(result.releaseableCost, currency)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Final Price</div>
                <div className="text-2xl font-bold text-primary">
                  {formatMoney(result.finalPrice, currency)}
                </div>
              </div>
            </div>

            <ExplainSection
              stackName={stackName}
              stackId={stackId}
              result={result}
              employees={employees}
              overheadTypes={overheadTypes}
              settings={settings}
              qaCostPerDevRelHour={qaCostPerDevRelHour}
              baCostPerDevRelHour={baCostPerDevRelHour}
              currency={currency}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
