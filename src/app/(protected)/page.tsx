import { db } from "@/lib/db";
import {
  type Employee,
  type OverheadType,
  type Settings,
  calculatePricing,
  calculatePricingForCategory,
  getExchangeRatio,
} from "@/lib/pricing";
import {
  calculateTotalMonthlyCost,
  calculateTotalOverheadMonthly,
  getOverheadAllocationSum,
  countEmployeesMissingAllocation,
  isAllocationValid,
  findMissingSettings,
  convertToMonthly,
  computeDevStackRow,
  computeAgenticStackRow,
  computeGlobalQaAddOnPerReleaseHr,
  computeGlobalBaAddOnPerReleaseHr,
} from "@/lib/dashboard";
import { calculateFullyLoadedMonthly } from "@/lib/pricing";
import { Prisma } from "@prisma/client";
import { formatMoney, formatPercent, formatNumber, formatPct, type Currency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { InactiveCostCard } from "./InactiveCostCard";

// Load all data efficiently
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
    orderBy: [{ category: "asc" }, { name: "asc" }],
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

// Convert Prisma employee to pricing Employee, filtering inactive allocations
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
): Employee {
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


export default async function DashboardPage({
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
  const allOverheadTypesFromDb = await db.overheadType.findMany({
    select: { id: true, isActive: true },
  });
  const overheadTypeBaseStatus = new Map(
    allOverheadTypesFromDb.map((t) => [t.id, t.isActive])
  );

  // Compute effective active status for all employees and overhead types
  const employeesWithEffective = employeesRaw.map((emp) => {
    const override = employeeOverrides.get(emp.id) || null;
    const effective = computeEffectiveEmployeeActive(emp.isActive, override);
    return { ...emp, effectiveIsActive: effective.isActive };
  });

  const overheadTypesWithEffective = overheadTypesRaw.map((type) => {
    const baseIsActive = overheadTypeBaseStatus.get(type.id) ?? false;
    const override = overheadTypeOverrides.get(type.id) || null;
    const effective = computeEffectiveOverheadTypeActive(baseIsActive, override);
    return { ...type, effectiveIsActive: effective.isActive };
  });

  // Get effective active overhead type IDs
  const effectiveActiveOverheadTypeIds = new Set(
    overheadTypesWithEffective
      .filter((t) => t.effectiveIsActive)
      .map((t) => t.id)
  );
  const activeOverheadTypes = overheadTypesRaw.filter((t) =>
    effectiveActiveOverheadTypeIds.has(t.id)
  );

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

  // Separate active and inactive employees using effectiveIsActive
  const activeEmployeesRaw = employeesWithEffective.filter((e) => e.effectiveIsActive);
  const inactiveEmployeesRaw = employeesWithEffective.filter((e) => !e.effectiveIsActive);
  
  // Convert both active and inactive employees to pricing format with effective allocations
  const activeEmployees = activeEmployeesRaw.map((emp) => 
    convertEmployee(emp, effectiveAllocationsMap.get(emp.id))
  );
  const inactiveEmployees = inactiveEmployeesRaw.map((emp) => 
    convertEmployee(emp, effectiveAllocationsMap.get(emp.id))
  );

  // Count inactive items for warnings (using effective status)
  const inactiveEmployeeCount = inactiveEmployeesRaw.length;
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

  const exchangeRatio = getExchangeRatio(settings);
  const currency: Currency = exchangeRatio && exchangeRatio > 0 ? "USD" : "EGP";

  // Group active employees by category
  const activeDevEmployees = activeEmployees.filter((e) => e.category === "DEV");
  const activeQaEmployees = activeEmployees.filter((e) => e.category === "QA");
  const activeBaEmployees = activeEmployees.filter((e) => e.category === "BA");
  const activeAgenticAiEmployees = activeEmployees.filter((e) => e.category === "AGENTIC_AI");

  // Group inactive employees by category
  const inactiveDevEmployees = inactiveEmployees.filter((e) => e.category === "DEV");
  const inactiveQaEmployees = inactiveEmployees.filter((e) => e.category === "QA");
  const inactiveBaEmployees = inactiveEmployees.filter((e) => e.category === "BA");
  const inactiveAgenticAiEmployees = inactiveEmployees.filter((e) => e.category === "AGENTIC_AI");

  // Helper to get setting with default
  function getSetting(settings: Settings, key: string, defaultValue: number): number {
    return settings[key] ?? defaultValue;
  }

  // Calculate active monthly costs by category
  const annualIncrease = getSetting(settings, "annual_increase", 0);
  const activeDevMonthlyCost = calculateTotalMonthlyCost(activeDevEmployees, activeOverheadTypes, exchangeRatio, annualIncrease);
  const activeQaMonthlyCost = calculateTotalMonthlyCost(activeQaEmployees, activeOverheadTypes, exchangeRatio, annualIncrease);
  const activeBaMonthlyCost = calculateTotalMonthlyCost(activeBaEmployees, activeOverheadTypes, exchangeRatio, annualIncrease);
  const activeAgenticAiMonthlyCost = calculateTotalMonthlyCost(activeAgenticAiEmployees, activeOverheadTypes, exchangeRatio, annualIncrease);
  const totalActiveMonthlyCost = activeDevMonthlyCost + activeQaMonthlyCost + activeBaMonthlyCost + activeAgenticAiMonthlyCost;

  // Calculate inactive monthly costs by category
  const inactiveDevMonthlyCost = calculateTotalMonthlyCost(inactiveDevEmployees, activeOverheadTypes, exchangeRatio, annualIncrease);
  const inactiveQaMonthlyCost = calculateTotalMonthlyCost(inactiveQaEmployees, activeOverheadTypes, exchangeRatio, annualIncrease);
  const inactiveBaMonthlyCost = calculateTotalMonthlyCost(inactiveBaEmployees, activeOverheadTypes, exchangeRatio, annualIncrease);
  const inactiveAgenticAiMonthlyCost = calculateTotalMonthlyCost(inactiveAgenticAiEmployees, activeOverheadTypes, exchangeRatio, annualIncrease);
  const totalInactiveMonthlyCost = inactiveDevMonthlyCost + inactiveQaMonthlyCost + inactiveBaMonthlyCost + inactiveAgenticAiMonthlyCost;

  // Calculate KPIs (only active items)
  const totalMonthlyCost = totalActiveMonthlyCost;
  const totalOverheadMonthly = calculateTotalOverheadMonthly(activeOverheadTypes, exchangeRatio);

  // Group DEV and AGENTIC_AI employees by tech stack (active only for stack calculations)
  const devByStack = new Map<string, Employee[]>();
  const agenticAiByStack = new Map<string, Employee[]>();
  
  activeDevEmployees.forEach((emp) => {
    const stackId = emp.techStackId || "unassigned";
    if (!devByStack.has(stackId)) {
      devByStack.set(stackId, []);
    }
    devByStack.get(stackId)!.push(emp);
  });

  activeAgenticAiEmployees.forEach((emp) => {
    const stackId = emp.techStackId || "unassigned";
    if (!agenticAiByStack.has(stackId)) {
      agenticAiByStack.set(stackId, []);
    }
    agenticAiByStack.get(stackId)!.push(emp);
  });

  // Get all unique stack IDs from employees (including unassigned)
  const allStackIds = new Set<string>();
  devByStack.forEach((_, stackId) => allStackIds.add(stackId));
  agenticAiByStack.forEach((_, stackId) => allStackIds.add(stackId));
  
  // Create a map of stack ID to stack object (including unassigned)
  const stackMap = new Map(techStacks.map((s) => [s.id, s]));
  const unassignedStack = { id: "unassigned", name: "Unassigned" };
  
  // Calculate stack pricing (only active items) - separate rows for DEV and AGENTIC_AI
  const stackData = Array.from(allStackIds).flatMap((stackId) => {
    const stack = stackMap.get(stackId) || unassignedStack;
    const stackDevs = devByStack.get(stackId) || [];
    const stackAgenticAi = agenticAiByStack.get(stackId) || [];
    const results = [];

    // Add DEV row if there are DEV employees
    if (stackDevs.length > 0) {
      // For unassigned, use null techStackId; otherwise use the stackId
      const techStackIdForCalc = stackId === "unassigned" ? null : stackId;
      const devResult = calculatePricingForCategory(
        "DEV",
        techStackIdForCalc,
        activeEmployees,
        activeOverheadTypes,
        settings
      );
      const devFte = stackDevs.reduce((sum, emp) => sum + emp.fte, 0);
      const devMonthlyCost = stackDevs.reduce(
        (sum, emp) => sum + calculateFullyLoadedMonthly(emp, activeOverheadTypes, exchangeRatio, annualIncrease),
        0
      );
      results.push({
        stack,
        category: "DEV" as const,
        devCount: stackDevs.length,
        totalFte: devFte,
        monthlyCost: devMonthlyCost,
        result: devResult,
      });
    }

    // Add AGENTIC_AI row if there are AGENTIC_AI employees
    if (stackAgenticAi.length > 0) {
      // For unassigned, use null techStackId; otherwise use the stackId
      const techStackIdForCalc = stackId === "unassigned" ? null : stackId;
      const agenticAiResult = calculatePricingForCategory(
        "AGENTIC_AI",
        techStackIdForCalc,
        activeEmployees,
        activeOverheadTypes,
        settings
      );
      const agenticAiFte = stackAgenticAi.reduce((sum, emp) => sum + emp.fte, 0);
      const agenticAiMonthlyCost = stackAgenticAi.reduce(
        (sum, emp) => sum + calculateFullyLoadedMonthly(emp, activeOverheadTypes, exchangeRatio, annualIncrease),
        0
      );
      results.push({
        stack,
        category: "AGENTIC_AI" as const,
        devCount: stackAgenticAi.length,
        totalFte: agenticAiFte,
        monthlyCost: agenticAiMonthlyCost,
        result: agenticAiResult,
      });
    }

    return results;
  });

  // Calculate overhead allocation data (only active items)
  const overheadData = activeOverheadTypes.map((type) => {
    const allocationSum = getOverheadAllocationSum(type.id, activeEmployees);
    const missingCount = countEmployeesMissingAllocation(type.id, activeEmployees);
    const monthlyEquivalent = convertToMonthly(type.amount, type.period);
    const monthlyEquivalentConverted = exchangeRatio && exchangeRatio > 0
      ? monthlyEquivalent / exchangeRatio
      : monthlyEquivalent;

    return {
      type,
      allocationSum,
      missingCount,
      monthlyEquivalent,
      monthlyEquivalentConverted,
      isValid: isAllocationValid(allocationSum),
    };
  });

  // Data quality checks (only active employees)
  const missingSettings = findMissingSettings(settings);
  const invalidOverheads = overheadData.filter((d) => !d.isValid);
  const employeesWithMissingAllocs = activeEmployees.filter((emp) => {
    return activeOverheadTypes.some((type) => {
      return !emp.overheadAllocs?.some((a) => a.overheadTypeId === type.id);
    });
  });

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <ViewSelector views={views} />
        </div>
      {/* Inactive Items Warning */}
      {(inactiveEmployeeCount > 0 || inactiveOverheadCount > 0) && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="text-sm text-yellow-800">
              <strong>Note:</strong> Excluding from calculations: {inactiveEmployeeCount} inactive employee(s) and {inactiveOverheadCount} inactive overhead type(s). Only active items are included in all cost/rate calculations.
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEmployees.length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              DEV: {activeDevEmployees.length} | QA: {activeQaEmployees.length} | BA: {activeBaEmployees.length} | Agentic AI: {activeAgenticAiEmployees.length}
            </div>
            {inactiveEmployeeCount > 0 && (
              <div className="text-xs text-yellow-600 mt-1">
                ({inactiveEmployeeCount} inactive excluded)
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Monthly Cost ({currency})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totalActiveMonthlyCost, currency)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Fully-loaded (active employees only)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Overhead Monthly ({currency})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totalOverheadMonthly, currency)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Sum of active overhead types
            </div>
            {inactiveOverheadCount > 0 && (
              <div className="text-xs text-yellow-600 mt-1">
                ({inactiveOverheadCount} inactive excluded)
              </div>
            )}
          </CardContent>
        </Card>

        {totalInactiveMonthlyCost > 0 && (
          <InactiveCostCard
            totalInactiveMonthlyCost={totalInactiveMonthlyCost}
            currency={currency}
            viewId={viewId}
          />
        )}
      </div>

      {/* Cost Summary by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Fully-Loaded Cost by Category ({currency})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Active Count</TableHead>
                <TableHead className="text-right">Active Cost</TableHead>
                <TableHead className="text-right">Inactive Count</TableHead>
                <TableHead className="text-right">Inactive Cost</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">DEV</TableCell>
                <TableCell className="text-right">{activeDevEmployees.length}</TableCell>
                <TableCell className="text-right">{formatMoney(activeDevMonthlyCost, currency)}</TableCell>
                <TableCell className="text-right">{inactiveDevEmployees.length}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatMoney(inactiveDevMonthlyCost, currency)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatMoney(activeDevMonthlyCost + inactiveDevMonthlyCost, currency)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">QA</TableCell>
                <TableCell className="text-right">{activeQaEmployees.length}</TableCell>
                <TableCell className="text-right">{formatMoney(activeQaMonthlyCost, currency)}</TableCell>
                <TableCell className="text-right">{inactiveQaEmployees.length}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatMoney(inactiveQaMonthlyCost, currency)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatMoney(activeQaMonthlyCost + inactiveQaMonthlyCost, currency)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">BA</TableCell>
                <TableCell className="text-right">{activeBaEmployees.length}</TableCell>
                <TableCell className="text-right">{formatMoney(activeBaMonthlyCost, currency)}</TableCell>
                <TableCell className="text-right">{inactiveBaEmployees.length}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatMoney(inactiveBaMonthlyCost, currency)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatMoney(activeBaMonthlyCost + inactiveBaMonthlyCost, currency)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Agentic AI</TableCell>
                <TableCell className="text-right">{activeAgenticAiEmployees.length}</TableCell>
                <TableCell className="text-right">{formatMoney(activeAgenticAiMonthlyCost, currency)}</TableCell>
                <TableCell className="text-right">{inactiveAgenticAiEmployees.length}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatMoney(inactiveAgenticAiMonthlyCost, currency)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatMoney(activeAgenticAiMonthlyCost + inactiveAgenticAiMonthlyCost, currency)}
                </TableCell>
              </TableRow>
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold">{activeEmployees.length}</TableCell>
                <TableCell className="text-right font-semibold">{formatMoney(totalActiveMonthlyCost, currency)}</TableCell>
                <TableCell className="text-right font-semibold">{inactiveEmployees.length}</TableCell>
                <TableCell className="text-right font-semibold text-muted-foreground">
                  {formatMoney(totalInactiveMonthlyCost, currency)}
                </TableCell>
                <TableCell className="text-right font-bold">
                  {formatMoney(totalActiveMonthlyCost + totalInactiveMonthlyCost, currency)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {/* Stacks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tech Stacks</CardTitle>
        </CardHeader>
        <CardContent>
          {stackData.length === 0 ? (
            <p className="text-muted-foreground italic">No tech stacks found with active DEV or AGENTIC_AI employees.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stack Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Count</TableHead>
                    <TableHead className="text-center">Total FTE</TableHead>
                    <TableHead className="text-right">Monthly Cost ({currency})</TableHead>
                    <TableHead className="text-right">Cost/Hour ({currency})</TableHead>
                    <TableHead className="text-right">Releaseable Cost/Hour ({currency})</TableHead>
                    <TableHead className="text-right">Final Price/Hour ({currency})</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stackData.map(({ stack, category, devCount, totalFte, monthlyCost, result }) => (
                    <TableRow key={`${stack.id}-${category}`}>
                      <TableCell className="font-medium">{stack.name}</TableCell>
                      <TableCell>{category === "DEV" ? "DEV" : "Agentic AI"}</TableCell>
                      <TableCell className="text-center">{devCount}</TableCell>
                      <TableCell className="text-center">{formatNumber(totalFte, 2)}</TableCell>
                      <TableCell className="text-right">{formatMoney(monthlyCost, currency)}</TableCell>
                      <TableCell className="text-right">
                        {result.devCostPerRelHour !== null
                          ? formatMoney(result.devCostPerRelHour, currency)
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        {result.releaseableCost !== null
                          ? formatMoney(result.releaseableCost, currency)
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">{formatMoney(result.finalPrice, currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overheads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Overheads (Active Only)</CardTitle>
        </CardHeader>
        <CardContent>
          {overheadData.length === 0 ? (
            <p className="text-muted-foreground italic">No active overhead types found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Overhead Name</TableHead>
                    <TableHead className="text-right">Amount ({currency})</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Monthly Equivalent ({currency})</TableHead>
                    <TableHead className="text-center">Allocation Sum %</TableHead>
                    <TableHead className="text-center">Missing Allocations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overheadData.map(({ type, allocationSum, missingCount, monthlyEquivalentConverted, isValid }) => {
                    const amountConverted = exchangeRatio && exchangeRatio > 0
                      ? type.amount / exchangeRatio
                      : type.amount;

                    return (
                      <TableRow
                        key={type.id}
                        className={!isValid ? "bg-yellow-50" : ""}
                      >
                        <TableCell className="font-medium">{type.name}</TableCell>
                        <TableCell className="text-right">{formatMoney(amountConverted, currency)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{type.period}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatMoney(monthlyEquivalentConverted, currency)}</TableCell>
                        <TableCell
                          className={`text-center font-medium ${
                            !isValid ? "text-destructive" : "text-green-600"
                          }`}
                        >
                          {formatPercent(allocationSum, "decimal")}
                        </TableCell>
                        <TableCell className="text-center">
                          {missingCount > 0 ? (
                            <span className="text-destructive font-medium">{missingCount}</span>
                          ) : (
                            <span className="text-green-600">0</span>
                          )}
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

      {/* Compute global QA/BA add-ons once */}
      {(() => {
        const qaAddOn = computeGlobalQaAddOnPerReleaseHr(activeQaEmployees, activeOverheadTypes, settings);
        const baAddOn = computeGlobalBaAddOnPerReleaseHr(activeBaEmployees, activeOverheadTypes, settings);

        return (
          <>
            {/* DEV Releaseable Hour Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>DEV Releaseable Hour Breakdown (per hr)</CardTitle>
              </CardHeader>
              <CardContent>
                {activeOverheadTypes.length === 0 ? (
                  <p className="text-muted-foreground italic">No active overhead types found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-background z-10">Stack</TableHead>
                          <TableHead className="text-right">Dev Cost</TableHead>
                          <TableHead className="text-right font-semibold">QA Add-on/hr</TableHead>
                          <TableHead className="text-right font-semibold">BA Add-on/hr</TableHead>
                          <TableHead className="text-right font-semibold bg-primary/10 border-l-2 border-r-2 border-primary">COGS</TableHead>
                          {activeOverheadTypes.map((type) => {
                            const allocationSum = getOverheadAllocationSum(type.id, activeEmployees);
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
                          <TableHead className="text-right">Margin</TableHead>
                          <TableHead className="text-right">Risk</TableHead>
                          <TableHead className="text-right font-bold">Final Price/hr</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {techStacks.map((stack) => {
                          const stackDevs = devByStack.get(stack.id) || [];
                          // Use raw QA/BA add-ons (without overheads)
                          const rowData = computeDevStackRow(
                            stack.id,
                            stackDevs,
                            activeOverheadTypes,
                            qaAddOn.raw,
                            baAddOn.raw,
                            settings
                          );

                          if (!rowData) {
                            return null;
                          }

                          // Add QA and BA overheads to each overhead type column
                          const overheadsWithQaBa = rowData.overheads.map((devOverhead, ohIdx) => {
                            const qaOverhead = qaAddOn.overheads[ohIdx] ?? 0;
                            const baOverhead = baAddOn.overheads[ohIdx] ?? 0;
                            const devOverheadValue = devOverhead ?? 0;
                            return devOverheadValue + qaOverhead + baOverhead;
                          });

                          // Recalculate total overheads including QA/BA contributions
                          const totalOverheadsWithQaBa = overheadsWithQaBa.reduce((sum, val) => sum + val, 0);
                          
                          // Recalculate total releaseable cost with raw QA/BA and updated overheads
                          const qaAddOnRaw = qaAddOn.raw;
                          const baAddOnRaw = baAddOn.raw;
                          const totalReleaseableCost = rowData.rawCost !== null
                            ? rowData.rawCost + totalOverheadsWithQaBa + qaAddOnRaw + baAddOnRaw
                            : null;
                          
                          // Calculate COGS = DevCost + QAAddOnRaw + BAAddOnRaw
                          const devCost = rowData.rawCost ?? 0;
                          const cogs = devCost + qaAddOnRaw + baAddOnRaw;
                          
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
                              <TableCell className="text-right font-semibold">
                                <div className="flex flex-col items-end">
                                  <span>{formatMoney(qaAddOnRaw, currency)}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatPct(calculatePct(qaAddOnRaw))}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                <div className="flex flex-col items-end">
                                  <span>{formatMoney(baAddOnRaw, currency)}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatPct(calculatePct(baAddOnRaw))}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-semibold bg-primary/10 border-l-2 border-r-2 border-primary">
                                <div className="flex flex-col items-end">
                                  <span>{formatMoney(cogs, currency)}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatPct(calculatePct(cogs))}
                                  </span>
                                </div>
                              </TableCell>
                              {overheadsWithQaBa.map((overhead, ohIdx) => (
                                <TableCell key={activeOverheadTypes[ohIdx].id} className="text-right">
                                  <div className="flex flex-col items-end">
                                    <span>{overhead !== null && overhead !== 0 ? formatMoney(overhead, currency) : "—"}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatPct(calculatePct(overhead))}
                                    </span>
                                  </div>
                                </TableCell>
                              ))}
                              <TableCell className="text-right font-semibold">
                                <div className="flex flex-col items-end">
                                  <span>{formatMoney(totalOverheadsWithQaBa, currency)}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatPct(calculatePct(totalOverheadsWithQaBa))}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {totalReleaseableCost !== null
                                  ? formatMoney(totalReleaseableCost, currency)
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatPercent(settings.margin ?? 0, "decimal")}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatPercent(settings.risk ?? 0, "decimal")}
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {(() => {
                                  const margin = settings.margin ?? 0.2;
                                  const risk = settings.risk ?? 0.1;
                                  const finalPrice = totalReleaseableCost !== null
                                    ? totalReleaseableCost * (1 + margin) * (1 + risk)
                                    : null;
                                  return finalPrice !== null ? formatMoney(finalPrice, currency) : "—";
                                })()}
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

            {/* AGENTIC_AI Releaseable Hour Breakdown */}
            {agenticAiByStack.size > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>AGENTIC_AI Releaseable Hour Breakdown (per hr)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-background z-10">Stack</TableHead>
                          <TableHead className="text-right">Raw Cost/hr</TableHead>
                          {activeOverheadTypes.map((type) => {
                            const allocationSum = getOverheadAllocationSum(type.id, activeEmployees);
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
                          <TableHead className="text-right">Margin</TableHead>
                          <TableHead className="text-right">Risk</TableHead>
                          <TableHead className="text-right font-bold">Final Price/hr</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {techStacks.map((stack) => {
                          const stackAgenticAi = agenticAiByStack.get(stack.id) || [];
                          const rowData = computeAgenticStackRow(
                            stack.id,
                            stackAgenticAi,
                            activeOverheadTypes,
                            settings
                          );

                          if (!rowData) {
                            return null;
                          }

                          const totalReleaseableCost = rowData.totalReleaseableCost;
                          
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
                                <TableCell key={activeOverheadTypes[ohIdx].id} className="text-right">
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
                              <TableCell className="text-right">
                                {formatPercent(settings.margin ?? 0, "decimal")}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatPercent(settings.risk ?? 0, "decimal")}
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {(() => {
                                  const margin = settings.margin ?? 0.2;
                                  const risk = settings.risk ?? 0.1;
                                  const finalPrice = totalReleaseableCost !== null
                                    ? totalReleaseableCost * (1 + margin) * (1 + risk)
                                    : null;
                                  return finalPrice !== null ? formatMoney(finalPrice, currency) : "—";
                                })()}
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
          </>
        );
      })()}

      {/* Data Quality Warnings */}
      {(missingSettings.length > 0 || invalidOverheads.length > 0 || employeesWithMissingAllocs.length > 0) && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">Data Quality Warnings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {missingSettings.length > 0 && (
              <div>
                <strong className="text-yellow-800">Missing Required Settings:</strong>
                <ul className="mt-2 ml-6 list-disc text-yellow-800">
                  {missingSettings.map((key) => (
                    <li key={key}>{key}</li>
                  ))}
                </ul>
              </div>
            )}

            {invalidOverheads.length > 0 && (
              <div>
                <strong className="text-yellow-800">
                  Overhead Types with Invalid Allocation Sums (not ~100%):
                </strong>
                <ul className="mt-2 ml-6 list-disc text-yellow-800">
                  {invalidOverheads.map(({ type, allocationSum }) => (
                    <li key={type.id}>
                      {type.name}: {formatPercent(allocationSum, "decimal")}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {employeesWithMissingAllocs.length > 0 && (
              <div>
                <strong className="text-yellow-800">
                  Employees Missing Allocation Rows ({employeesWithMissingAllocs.length}):
                </strong>
                <ul className="mt-2 ml-6 list-disc text-yellow-800">
                  {employeesWithMissingAllocs.slice(0, 10).map((emp) => (
                    <li key={emp.id}>
                      {emp.name} ({emp.category})
                    </li>
                  ))}
                  {employeesWithMissingAllocs.length > 10 && (
                    <li className="italic">
                      ... and {employeesWithMissingAllocs.length - 10} more
                    </li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No warnings message */}
      {missingSettings.length === 0 &&
        invalidOverheads.length === 0 &&
        employeesWithMissingAllocs.length === 0 && (
          <Card className="border-green-500 bg-green-50">
            <CardContent className="pt-6">
              <div className="text-green-800">✓ All data quality checks passed. No warnings.</div>
            </CardContent>
          </Card>
        )}
      </div>
  );
}
