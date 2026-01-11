/**
 * Pricing calculation functions based on SPEC.md
 * Pure functions with clear inputs/outputs
 * All money values are stored in EGP and converted to USD if exchange_ratio is provided
 */

export type EmployeeCategory = "DEV" | "QA" | "BA" | "AGENTIC_AI";

export interface Employee {
  id: string;
  name: string;
  category: EmployeeCategory;
  techStackId: string | null;
  grossMonthly: number; // in EGP
  netMonthly: number; // in EGP
  oncostRate: number | null;
  annualBenefits: number | null; // in EGP
  annualBonus: number | null; // in EGP
  fte: number;
  overheadAllocs?: {
    overheadTypeId: string;
    share: number;
  }[];
}

export interface OverheadType {
  id: string;
  name: string;
  amount: number; // in EGP
  period: "annual" | "monthly" | "quarterly";
}

export interface Settings {
  [key: string]: number; // key -> value (parsed as number)
}

export interface PricingResult {
  devCostPerRelHour: number | null;
  qaCostPerDevRelHour: number;
  baCostPerDevRelHour: number;
  releaseableCost: number | null;
  finalPrice: number | null;
}

export interface BreakdownLine {
  label: string;
  value: number | null;
  formula?: string;
  inputs?: Record<string, number | string>;
}

export interface Breakdown {
  title: string;
  metricKey: string;
  result: number | null;
  currency: "EGP" | "USD";
  lines: BreakdownLine[];
}

/**
 * Get setting value by key, with default fallback
 */
function getSetting(settings: Settings, key: string, defaultValue: number): number {
  return settings[key] ?? defaultValue;
}

/**
 * Convert EGP amount to USD if exchange_ratio is provided
 * If exchange_ratio is not set or is 0, returns amount in EGP
 * exchange_ratio represents: 1 USD = exchange_ratio EGP
 */
function convertCurrency(amount: number, exchangeRatio: number | null): number {
  if (!exchangeRatio || exchangeRatio <= 0) {
    return amount; // Return in EGP if no exchange ratio
  }
  return amount / exchangeRatio; // Convert EGP to USD
}

/**
 * Get exchange ratio from settings
 * Returns null if not set (meaning use EGP)
 */
export function getExchangeRatio(settings: Settings): number | null {
  const ratio = settings.exchange_ratio;
  if (ratio === undefined || ratio === null || ratio <= 0) {
    return null;
  }
  return ratio;
}

/**
 * Convert overhead amount to annual based on period
 */
function convertToAnnual(amount: number, period: "annual" | "monthly" | "quarterly"): number {
  switch (period) {
    case "annual":
      return amount;
    case "monthly":
      return amount * 12;
    case "quarterly":
      return amount * 4;
    default:
      return amount;
  }
}

/**
 * Convert overhead amount to monthly based on period
 */
function convertToMonthly(amount: number, period: "annual" | "monthly" | "quarterly"): number {
  switch (period) {
    case "annual":
      return amount / 12;
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    default:
      return amount;
  }
}

/**
 * Get adjusted gross monthly salary after applying annual increase
 * @param employee - Employee object
 * @param annualIncrease - Annual increase rate (e.g., 0.10 for 10%)
 * @returns Adjusted gross monthly salary
 */
export function getAdjustedGrossMonthly(
  employee: Employee,
  annualIncrease: number = 0
): number {
  const increase = Number.isFinite(annualIncrease) ? annualIncrease : 0;
  return employee.grossMonthly * (1 + increase);
}

/**
 * Calculate employee annual base cost (in EGP, converted to USD if exchange_ratio provided)
 * annualBase = adjustedGrossMonthly*12 + adjustedGrossMonthly*12*oncostRate + annualBenefits + annualBonus
 * where adjustedGrossMonthly = grossMonthly * (1 + annualIncrease)
 */
export function calculateAnnualBase(
  employee: Employee,
  exchangeRatio: number | null,
  annualIncrease: number = 0
): number {
  const adjustedGrossMonthly = getAdjustedGrossMonthly(employee, annualIncrease);
  const grossAnnual = adjustedGrossMonthly * 12;
  const oncostAmount = employee.oncostRate
    ? grossAnnual * employee.oncostRate
    : 0;
  const benefits = employee.annualBenefits ?? 0;
  const bonus = employee.annualBonus ?? 0;

  const annualBaseEGP = grossAnnual + oncostAmount + benefits + bonus;
  return convertCurrency(annualBaseEGP, exchangeRatio);
}

/**
 * Calculate allocated overhead to employee (annual, in EGP, converted to USD if exchange_ratio provided)
 * Sum all OverheadType amounts (converted to annual) allocated by OverheadAllocation shares
 * allocatedOverheadAnnual = sum(overheadType.amountAnnual * share for each allocated overhead type)
 */
export function calculateAllocatedOverhead(
  employee: Employee,
  overheadTypes: OverheadType[],
  exchangeRatio: number | null
): number {
  if (!employee.overheadAllocs || employee.overheadAllocs.length === 0) {
    return 0;
  }

  const overheadAnnualEGP = employee.overheadAllocs.reduce((total, alloc) => {
    const overheadType = overheadTypes.find((ot) => ot.id === alloc.overheadTypeId);
    if (!overheadType) {
      return total;
    }

    const overheadAnnual = convertToAnnual(overheadType.amount, overheadType.period);
    return total + overheadAnnual * alloc.share;
  }, 0);

  return convertCurrency(overheadAnnualEGP, exchangeRatio);
}

/**
 * Calculate fully loaded annual cost (in EGP, converted to USD if exchange_ratio provided)
 * fullyLoadedAnnual = annualBase + allocatedOverheadAnnual
 */
export function calculateFullyLoadedAnnual(
  employee: Employee,
  overheadTypes: OverheadType[],
  exchangeRatio: number | null,
  annualIncrease: number = 0
): number {
  const annualBase = calculateAnnualBase(employee, exchangeRatio, annualIncrease);
  const allocatedOverhead = calculateAllocatedOverhead(employee, overheadTypes, exchangeRatio);
  return annualBase + allocatedOverhead;
}

/**
 * Calculate fully loaded monthly cost (in EGP, converted to USD if exchange_ratio provided)
 * fullyLoadedMonthly = fullyLoadedAnnual / 12
 */
export function calculateFullyLoadedMonthly(
  employee: Employee,
  overheadTypes: OverheadType[],
  exchangeRatio: number | null,
  annualIncrease: number = 0
): number {
  const fullyLoadedAnnual = calculateFullyLoadedAnnual(employee, overheadTypes, exchangeRatio, annualIncrease);
  return fullyLoadedAnnual / 12;
}

/**
 * Calculate cost per releaseable hour for a category (DEV or AGENTIC_AI) in a stack
 * monthlyCost(S) = sum(fullyLoadedMonthly of employees in stack S with category)
 * hoursCapacity(S) = devReleasableHoursPerMonth * sum(fte of employees in stack S with category)
 * costPerRelHour(S) = monthlyCost(S) / hoursCapacity(S)
 *
 * Returns null if divide-by-zero (no employees or no capacity)
 */
export function calculateCostPerRelHour(
  employees: Employee[],
  overheadTypes: OverheadType[],
  settings: Settings
): number | null {
  if (employees.length === 0) {
    return null;
  }

  const exchangeRatio = getExchangeRatio(settings);
  const devReleasableHoursPerMonth = getSetting(
    settings,
    "dev_releasable_hours_per_month",
    100
  );

  const annualIncrease = getSetting(settings, "annual_increase", 0);
  const monthlyCost = employees.reduce(
    (sum, emp) => sum + calculateFullyLoadedMonthly(emp, overheadTypes, exchangeRatio, annualIncrease),
    0
  );

  const totalFte = employees.reduce((sum, emp) => sum + emp.fte, 0);
  const hoursCapacity = devReleasableHoursPerMonth * totalFte;

  if (hoursCapacity === 0) {
    throw new Error(
      "Cannot calculate cost per releaseable hour: hoursCapacity is zero (no FTE or dev_releasable_hours_per_month is zero)"
    );
  }

  return monthlyCost / hoursCapacity;
}

/**
 * Calculate per-stack hourly cost for a given category (DEV or AGENTIC_AI)
 * This function filters employees by category and tech stack, then calculates
 * the hourly cost using the same capacity logic (dev_releasable_hours_per_month * sum(fte))
 *
 * @param category - "DEV" or "AGENTIC_AI"
 * @param techStackId - The tech stack ID to filter employees
 * @param allEmployees - All employees (should be filtered to active only)
 * @param overheadTypes - Overhead types (should be filtered to active only)
 * @param settings - Settings including dev_releasable_hours_per_month
 * @returns Hourly cost per releaseable hour, or null if no employees or no capacity
 */
export function calculatePerStackHourlyCostForCategory(
  category: "DEV" | "AGENTIC_AI",
  techStackId: string,
  allEmployees: Employee[],
  overheadTypes: OverheadType[],
  settings: Settings
): number | null {
  const categoryEmployees = allEmployees.filter(
    (emp) => emp.category === category && emp.techStackId === techStackId
  );
  return calculateCostPerRelHour(categoryEmployees, overheadTypes, settings);
}

/**
 * Calculate DEV cost per releaseable hour for a stack
 * devMonthlyCost(S) = sum(fullyLoadedMonthly of DEV in stack S)
 * devHoursCapacity(S) = devReleasableHoursPerMonth * sum(fte of DEV in stack S)
 * devCostPerRelHour(S) = devMonthlyCost(S) / devHoursCapacity(S)
 *
 * Returns null if divide-by-zero (no DEV employees or no capacity)
 */
export function calculateDevCostPerRelHour(
  devEmployees: Employee[],
  overheadTypes: OverheadType[],
  settings: Settings
): number | null {
  return calculateCostPerRelHour(devEmployees, overheadTypes, settings);
}

/**
 * Calculate QA cost per dev releaseable hour
 * qaMonthlyCost = sum(fullyLoadedMonthly of QA)
 * qaCostPerQaHour = qaMonthlyCost / standardHoursPerMonth
 * qaCostPerDevRelHour = qaRatio * qaCostPerQaHour
 *
 * Returns 0 if no QA employees (missing QA team)
 */
export function calculateQaCostPerDevRelHour(
  qaEmployees: Employee[],
  overheadTypes: OverheadType[],
  settings: Settings
): number {
  if (qaEmployees.length === 0) {
    return 0; // Missing QA team treated as 0 cost
  }

  const exchangeRatio = getExchangeRatio(settings);
  const standardHoursPerMonth = getSetting(settings, "standard_hours_per_month", 160);
  const qaRatio = getSetting(settings, "qa_ratio", 0.5);

  const annualIncrease = getSetting(settings, "annual_increase", 0);
  const qaMonthlyCost = qaEmployees.reduce(
    (sum, emp) => sum + calculateFullyLoadedMonthly(emp, overheadTypes, exchangeRatio, annualIncrease),
    0
  );

  if (standardHoursPerMonth === 0) {
    throw new Error(
      "Cannot calculate QA cost per dev releaseable hour: standard_hours_per_month is zero"
    );
  }

  const qaCostPerQaHour = qaMonthlyCost / standardHoursPerMonth;
  return qaRatio * qaCostPerQaHour;
}

/**
 * Calculate BA cost per dev releaseable hour
 * baMonthlyCost = sum(fullyLoadedMonthly of BA)
 * baCostPerBaHour = baMonthlyCost / standardHoursPerMonth
 * baCostPerDevRelHour = baRatio * baCostPerBaHour
 *
 * Returns 0 if no BA employees (missing BA team)
 */
export function calculateBaCostPerDevRelHour(
  baEmployees: Employee[],
  overheadTypes: OverheadType[],
  settings: Settings
): number {
  if (baEmployees.length === 0) {
    return 0; // Missing BA team treated as 0 cost
  }

  const exchangeRatio = getExchangeRatio(settings);
  const standardHoursPerMonth = getSetting(settings, "standard_hours_per_month", 160);
  const baRatio = getSetting(settings, "ba_ratio", 0.25);

  const annualIncrease = getSetting(settings, "annual_increase", 0);
  const baMonthlyCost = baEmployees.reduce(
    (sum, emp) => sum + calculateFullyLoadedMonthly(emp, overheadTypes, exchangeRatio, annualIncrease),
    0
  );

  if (standardHoursPerMonth === 0) {
    throw new Error(
      "Cannot calculate BA cost per dev releaseable hour: standard_hours_per_month is zero"
    );
  }

  const baCostPerBaHour = baMonthlyCost / standardHoursPerMonth;
  return baRatio * baCostPerBaHour;
}

/**
 * Calculate raw monthly cost for an employee (salary + oncost + benefits + bonus, NO overhead)
 * rawMonthly = adjustedGrossMonthly * (1 + oncostRate) + (annualBenefits / 12) + (annualBonus / 12)
 * where adjustedGrossMonthly = grossMonthly * (1 + annualIncrease)
 */
export function calculateRawMonthly(employee: Employee, annualIncrease: number = 0): number {
  const adjustedGrossMonthly = getAdjustedGrossMonthly(employee, annualIncrease);
  const oncostRate = employee.oncostRate ?? 0;
  const annualBenefits = employee.annualBenefits ?? 0;
  const annualBonus = employee.annualBonus ?? 0;
  return adjustedGrossMonthly * (1 + oncostRate) + annualBenefits / 12 + annualBonus / 12;
}

/**
 * Calculate releaseable cost per hour
 * releaseableCost(S) = devCostPerRelHour(S) + qaCostPerDevRelHour + baCostPerDevRelHour
 *
 * Returns null if devCostPerRelHour is null
 */
export function calculateReleaseableCost(
  devCostPerRelHour: number | null,
  qaCostPerDevRelHour: number,
  baCostPerDevRelHour: number
): number | null {
  if (devCostPerRelHour === null) {
    return null;
  }

  return devCostPerRelHour + qaCostPerDevRelHour + baCostPerDevRelHour;
}

/**
 * Calculate final price
 * finalPrice(S) = releaseableCost(S) * (1 + margin) * (1 + risk)
 *
 * Returns null if releaseableCost is null
 */
export function calculateFinalPrice(
  releaseableCost: number | null,
  settings: Settings
): number | null {
  if (releaseableCost === null) {
    return null;
  }

  const margin = getSetting(settings, "margin", 0.2);
  const risk = getSetting(settings, "risk", 0.1);

  return releaseableCost * (1 + margin) * (1 + risk);
}

/**
 * Calculate pricing for a specific category (DEV or AGENTIC_AI) in a tech stack
 * For DEV: includes QA/BA costs
 * For AGENTIC_AI: excludes QA/BA costs
 */
export function calculatePricingForCategory(
  category: "DEV" | "AGENTIC_AI",
  techStackId: string | null,
  allEmployees: Employee[],
  overheadTypes: OverheadType[],
  settings: Settings
): PricingResult {
  // Filter employees by category and tech stack
  const categoryEmployees = allEmployees.filter(
    (emp) => emp.category === category && emp.techStackId === techStackId
  );
  const qaEmployees = allEmployees.filter((emp) => emp.category === "QA");
  const baEmployees = allEmployees.filter((emp) => emp.category === "BA");

  // Calculate cost per releaseable hour for the category
  const costPerRelHour = calculateCostPerRelHour(
    categoryEmployees,
    overheadTypes,
    settings
  );

  // For DEV, include QA/BA costs; for AGENTIC_AI, exclude them
  const qaCostPerDevRelHour =
    category === "DEV"
      ? calculateQaCostPerDevRelHour(qaEmployees, overheadTypes, settings)
      : 0;
  const baCostPerDevRelHour =
    category === "DEV"
      ? calculateBaCostPerDevRelHour(baEmployees, overheadTypes, settings)
      : 0;

  // Calculate releaseable cost and final price
  const releaseableCost = calculateReleaseableCost(
    costPerRelHour,
    qaCostPerDevRelHour,
    baCostPerDevRelHour
  );
  const finalPrice = calculateFinalPrice(releaseableCost, settings);

  return {
    devCostPerRelHour: costPerRelHour,
    qaCostPerDevRelHour,
    baCostPerDevRelHour,
    releaseableCost,
    finalPrice,
  };
}

/**
 * Main pricing calculation function
 * Computes all pricing metrics for a tech stack (DEV category with QA/BA)
 * @deprecated Use calculatePricingForCategory instead for category-specific pricing
 */
export function calculatePricing(
  techStackId: string,
  allEmployees: Employee[],
  overheadTypes: OverheadType[],
  settings: Settings
): PricingResult {
  return calculatePricingForCategory(
    "DEV",
    techStackId,
    allEmployees,
    overheadTypes,
    settings
  );
}

/**
 * Calculate pricing with detailed breakdowns for each metric
 * Returns pricing result and a map of breakdowns keyed by metricKey
 */
export function calculatePricingWithBreakdowns(
  category: "DEV" | "AGENTIC_AI",
  techStackId: string | null,
  allEmployees: Employee[],
  overheadTypes: OverheadType[],
  settings: Settings
): {
  pricing: PricingResult;
  breakdowns: Map<string, Breakdown>;
} {
  const breakdowns = new Map<string, Breakdown>();
  const exchangeRatio = getExchangeRatio(settings);
  const currency: "EGP" | "USD" = exchangeRatio && exchangeRatio > 0 ? "USD" : "EGP";
  const devReleasableHoursPerMonth = getSetting(settings, "dev_releasable_hours_per_month", 100);
  const standardHoursPerMonth = getSetting(settings, "standard_hours_per_month", 160);
  const qaRatio = getSetting(settings, "qa_ratio", 0.5);
  const baRatio = getSetting(settings, "ba_ratio", 0.25);
  const annualIncrease = getSetting(settings, "annual_increase", 0);
  const margin = getSetting(settings, "margin", 0.2);
  const risk = getSetting(settings, "risk", 0.1);

  // Filter employees
  const categoryEmployees = allEmployees.filter(
    (emp) => emp.category === category && emp.techStackId === techStackId
  );
  const qaEmployees = allEmployees.filter((emp) => emp.category === "QA");
  const baEmployees = allEmployees.filter((emp) => emp.category === "BA");

  // Calculate raw cost per releaseable hour
  const totalFte = categoryEmployees.reduce((sum, emp) => sum + emp.fte, 0);
  const capacityHours = devReleasableHoursPerMonth * totalFte;
  let rawCostPerRelHour: number | null = null;

  if (capacityHours > 0) {
    const rawMonthlyTotal = categoryEmployees.reduce(
      (sum, emp) => sum + calculateRawMonthly(emp, annualIncrease),
      0
    );
    const rawCostPerHourEGP = rawMonthlyTotal / capacityHours;
    rawCostPerRelHour = exchangeRatio && exchangeRatio > 0 ? rawCostPerHourEGP / exchangeRatio : rawCostPerHourEGP;

    // Breakdown for raw cost
    const rawBreakdown: Breakdown = {
      title: "Dev Cost (Raw Cost/hr)",
      metricKey: "dev_raw_hr",
      result: rawCostPerRelHour,
      currency,
      lines: [
        {
          label: "Employees",
          value: categoryEmployees.length,
          inputs: { count: categoryEmployees.length },
        },
        {
          label: "Total FTE",
          value: totalFte,
          formula: "sum(fte)",
        },
        {
          label: "Dev Releasable Hours/Month",
          value: devReleasableHoursPerMonth,
          inputs: { setting: "dev_releasable_hours_per_month" },
        },
        {
          label: "Capacity Hours/Month",
          value: capacityHours,
          formula: "dev_releasable_hours_per_month * total_fte",
        },
        {
          label: "Raw Monthly Total (EGP)",
          value: rawMonthlyTotal,
          formula: "sum(rawMonthly per employee)",
        },
        {
          label: "Raw Cost/Hour (EGP)",
          value: rawCostPerHourEGP,
          formula: "raw_monthly_total / capacity_hours",
        },
        ...(exchangeRatio && exchangeRatio > 0
          ? [
              {
                label: "Exchange Ratio",
                value: exchangeRatio,
                inputs: { setting: "exchange_ratio" },
              },
              {
                label: "Raw Cost/Hour (USD)",
                value: rawCostPerRelHour,
                formula: "raw_cost_per_hour_egp / exchange_ratio",
              },
            ]
          : []),
      ],
    };
    breakdowns.set("dev_raw_hr", rawBreakdown);
  }

  // Calculate overheads per type
  const overheadsPerType: (number | null)[] = [];
  overheadTypes.forEach((type, idx) => {
    let overheadPerRelHour: number | null = null;
    if (capacityHours > 0) {
      const overheadMonthly = convertToMonthly(type.amount, type.period);
      const shareSum = categoryEmployees.reduce((sum, emp) => {
        const alloc = emp.overheadAllocs?.find((a) => a.overheadTypeId === type.id);
        return sum + (alloc?.share ?? 0);
      }, 0);
      const devOverheadMonthly = overheadMonthly * shareSum;
      const overheadPerHourEGP = devOverheadMonthly / capacityHours;
      overheadPerRelHour = exchangeRatio && exchangeRatio > 0 ? overheadPerHourEGP / exchangeRatio : overheadPerHourEGP;

      // Breakdown for this overhead type
      const overheadBreakdown: Breakdown = {
        title: `${type.name} Overhead/hr`,
        metricKey: `dev_overhead_hr:${type.id}`,
        result: overheadPerRelHour,
        currency,
        lines: [
          {
            label: "Overhead Amount",
            value: type.amount,
            inputs: { period: type.period },
          },
          {
            label: "Overhead Monthly (EGP)",
            value: overheadMonthly,
            formula: type.period === "annual" ? "amount / 12" : type.period === "quarterly" ? "amount / 3" : "amount",
          },
          {
            label: "Allocation Share Sum",
            value: shareSum,
            formula: "sum(share for category employees)",
          },
          {
            label: "Dev Overhead Monthly (EGP)",
            value: devOverheadMonthly,
            formula: "overhead_monthly * share_sum",
          },
          {
            label: "Capacity Hours/Month",
            value: capacityHours,
            formula: "dev_releasable_hours_per_month * total_fte",
          },
          {
            label: "Overhead/Hour (EGP)",
            value: overheadPerHourEGP,
            formula: "dev_overhead_monthly / capacity_hours",
          },
          ...(exchangeRatio && exchangeRatio > 0
            ? [
                {
                  label: "Exchange Ratio",
                  value: exchangeRatio,
                  inputs: { setting: "exchange_ratio" },
                },
                {
                  label: "Overhead/Hour (USD)",
                  value: overheadPerRelHour,
                  formula: "overhead_per_hour_egp / exchange_ratio",
                },
              ]
            : []),
        ],
      };
      breakdowns.set(`dev_overhead_hr:${type.id}`, overheadBreakdown);
    }
    overheadsPerType.push(overheadPerRelHour);
  });

  // Calculate total overheads
  const totalOverheads = overheadsPerType.reduce((sum: number, val) => sum + (val ?? 0), 0);
  if (capacityHours > 0) {
    const totalOverheadsBreakdown: Breakdown = {
      title: "Total Overheads/hr",
      metricKey: "total_overheads_hr",
      result: totalOverheads,
      currency,
      lines: [
        {
          label: "Overhead Types Count",
          value: overheadTypes.length,
        },
        {
          label: "Sum of All Overheads",
          value: totalOverheads,
          formula: "sum(overhead_per_type)",
        },
      ],
    };
    breakdowns.set("total_overheads_hr", totalOverheadsBreakdown);
  }

  // Calculate QA add-on (only for DEV)
  let qaAddOnPerRelHour = 0;
  if (category === "DEV" && qaEmployees.length > 0 && standardHoursPerMonth > 0) {
    const qaRawMonthly = qaEmployees.reduce(
      (sum, emp) => sum + calculateRawMonthly(emp, annualIncrease),
      0
    );
    const qaRawPerQaHour = qaRawMonthly / standardHoursPerMonth;
    const qaAddOnEGP = qaRatio * qaRawPerQaHour;
    qaAddOnPerRelHour = exchangeRatio && exchangeRatio > 0 ? qaAddOnEGP / exchangeRatio : qaAddOnEGP;

    // Add overhead contributions to QA add-on
    const qaOverheadDetails = overheadTypes.map((type) => {
      const overheadMonthly = convertToMonthly(type.amount, type.period);
      const shareSum = qaEmployees.reduce((sum, emp) => {
        const alloc = emp.overheadAllocs?.find((a) => a.overheadTypeId === type.id);
        return sum + (alloc?.share ?? 0);
      }, 0);
      const qaOverheadMonthly = overheadMonthly * shareSum;
      const qaPerQaHour = qaOverheadMonthly / standardHoursPerMonth;
      const qaAddOnForTypeEGP = qaRatio * qaPerQaHour;
      const qaAddOnForType = exchangeRatio && exchangeRatio > 0 ? qaAddOnForTypeEGP / exchangeRatio : qaAddOnForTypeEGP;
      return {
        type,
        overheadMonthly,
        shareSum,
        qaOverheadMonthly,
        qaPerQaHour,
        qaAddOnForTypeEGP,
        qaAddOnForType,
      };
    });
    const qaOverheadsTotal = qaOverheadDetails.reduce((sum, detail) => sum + detail.qaAddOnForType, 0);
    const qaAddOnTotal = qaAddOnPerRelHour + qaOverheadsTotal;

    // Breakdown for QA add-on
    const qaBreakdown: Breakdown = {
      title: "QA Add-on/hr",
      metricKey: "qa_addon_hr",
      result: qaAddOnTotal,
      currency,
      lines: [
        {
          label: "QA Employees",
          value: qaEmployees.length,
        },
        {
          label: "QA Raw Monthly (EGP)",
          value: qaRawMonthly,
          formula: "sum(rawMonthly for QA employees)",
        },
        {
          label: "Standard Hours/Month",
          value: standardHoursPerMonth,
          inputs: { setting: "standard_hours_per_month" },
        },
        {
          label: "QA Raw/Hour (EGP)",
          value: qaRawPerQaHour,
          formula: "qa_raw_monthly / standard_hours_per_month",
        },
        {
          label: "QA Ratio",
          value: qaRatio,
          inputs: { setting: "qa_ratio" },
        },
        {
          label: "QA Add-on Raw (EGP)",
          value: qaAddOnEGP,
          formula: "qa_ratio * qa_raw_per_hour",
        },
        ...(exchangeRatio && exchangeRatio > 0
          ? [
              {
                label: "QA Add-on Raw (USD)",
                value: qaAddOnPerRelHour,
                formula: "qa_addon_raw_egp / exchange_ratio",
              },
            ]
          : []),
        // Individual overhead type contributions
        ...qaOverheadDetails.flatMap((detail) => [
          {
            label: `${detail.type.name} - Overhead Monthly (EGP)`,
            value: detail.overheadMonthly,
            formula: detail.type.period === "annual" ? "amount / 12" : detail.type.period === "quarterly" ? "amount / 3" : "amount",
            inputs: { overheadType: detail.type.name, period: detail.type.period },
          },
          {
            label: `${detail.type.name} - Allocation Share Sum`,
            value: detail.shareSum,
            formula: "sum(share for QA employees)",
          },
          {
            label: `${detail.type.name} - QA Overhead Monthly (EGP)`,
            value: detail.qaOverheadMonthly,
            formula: "overhead_monthly * share_sum",
          },
          {
            label: `${detail.type.name} - QA/Hour (EGP)`,
            value: detail.qaPerQaHour,
            formula: "qa_overhead_monthly / standard_hours_per_month",
          },
          {
            label: `${detail.type.name} - QA Add-on (EGP)`,
            value: detail.qaAddOnForTypeEGP,
            formula: "qa_ratio * qa_per_hour",
          },
          ...(exchangeRatio && exchangeRatio > 0
            ? [
                {
                  label: `${detail.type.name} - QA Add-on (USD)`,
                  value: detail.qaAddOnForType,
                  formula: "qa_addon_egp / exchange_ratio",
                },
              ]
            : []),
        ]),
        {
          label: "QA Overheads Total",
          value: qaOverheadsTotal,
          formula: `sum(${qaOverheadDetails.map((d) => d.type.name).join(", ")})`,
        },
        {
          label: "QA Add-on Total",
          value: qaAddOnTotal,
          formula: "qa_addon_raw + qa_overheads_total",
        },
      ],
    };
    breakdowns.set("qa_addon_hr", qaBreakdown);
  }

  // Calculate BA add-on (only for DEV)
  let baAddOnPerRelHour = 0;
  if (category === "DEV" && baEmployees.length > 0 && standardHoursPerMonth > 0) {
    const baRawMonthly = baEmployees.reduce(
      (sum, emp) => sum + calculateRawMonthly(emp, annualIncrease),
      0
    );
    const baRawPerBaHour = baRawMonthly / standardHoursPerMonth;
    const baAddOnEGP = baRatio * baRawPerBaHour;
    baAddOnPerRelHour = exchangeRatio && exchangeRatio > 0 ? baAddOnEGP / exchangeRatio : baAddOnEGP;

    // Add overhead contributions to BA add-on
    const baOverheadDetails = overheadTypes.map((type) => {
      const overheadMonthly = convertToMonthly(type.amount, type.period);
      const shareSum = baEmployees.reduce((sum, emp) => {
        const alloc = emp.overheadAllocs?.find((a) => a.overheadTypeId === type.id);
        return sum + (alloc?.share ?? 0);
      }, 0);
      const baOverheadMonthly = overheadMonthly * shareSum;
      const baPerBaHour = baOverheadMonthly / standardHoursPerMonth;
      const baAddOnForTypeEGP = baRatio * baPerBaHour;
      const baAddOnForType = exchangeRatio && exchangeRatio > 0 ? baAddOnForTypeEGP / exchangeRatio : baAddOnForTypeEGP;
      return {
        type,
        overheadMonthly,
        shareSum,
        baOverheadMonthly,
        baPerBaHour,
        baAddOnForTypeEGP,
        baAddOnForType,
      };
    });
    const baOverheadsTotal = baOverheadDetails.reduce((sum, detail) => sum + detail.baAddOnForType, 0);
    const baAddOnTotal = baAddOnPerRelHour + baOverheadsTotal;

    // Breakdown for BA add-on
    const baBreakdown: Breakdown = {
      title: "BA Add-on/hr",
      metricKey: "ba_addon_hr",
      result: baAddOnTotal,
      currency,
      lines: [
        {
          label: "BA Employees",
          value: baEmployees.length,
        },
        {
          label: "BA Raw Monthly (EGP)",
          value: baRawMonthly,
          formula: "sum(rawMonthly for BA employees)",
        },
        {
          label: "Standard Hours/Month",
          value: standardHoursPerMonth,
          inputs: { setting: "standard_hours_per_month" },
        },
        {
          label: "BA Raw/Hour (EGP)",
          value: baRawPerBaHour,
          formula: "ba_raw_monthly / standard_hours_per_month",
        },
        {
          label: "BA Ratio",
          value: baRatio,
          inputs: { setting: "ba_ratio" },
        },
        {
          label: "BA Add-on Raw (EGP)",
          value: baAddOnEGP,
          formula: "ba_ratio * ba_raw_per_hour",
        },
        ...(exchangeRatio && exchangeRatio > 0
          ? [
              {
                label: "BA Add-on Raw (USD)",
                value: baAddOnPerRelHour,
                formula: "ba_addon_raw_egp / exchange_ratio",
              },
            ]
          : []),
        // Individual overhead type contributions
        ...baOverheadDetails.flatMap((detail) => [
          {
            label: `${detail.type.name} - Overhead Monthly (EGP)`,
            value: detail.overheadMonthly,
            formula: detail.type.period === "annual" ? "amount / 12" : detail.type.period === "quarterly" ? "amount / 3" : "amount",
            inputs: { overheadType: detail.type.name, period: detail.type.period },
          },
          {
            label: `${detail.type.name} - Allocation Share Sum`,
            value: detail.shareSum,
            formula: "sum(share for BA employees)",
          },
          {
            label: `${detail.type.name} - BA Overhead Monthly (EGP)`,
            value: detail.baOverheadMonthly,
            formula: "overhead_monthly * share_sum",
          },
          {
            label: `${detail.type.name} - BA/Hour (EGP)`,
            value: detail.baPerBaHour,
            formula: "ba_overhead_monthly / standard_hours_per_month",
          },
          {
            label: `${detail.type.name} - BA Add-on (EGP)`,
            value: detail.baAddOnForTypeEGP,
            formula: "ba_ratio * ba_per_hour",
          },
          ...(exchangeRatio && exchangeRatio > 0
            ? [
                {
                  label: `${detail.type.name} - BA Add-on (USD)`,
                  value: detail.baAddOnForType,
                  formula: "ba_addon_egp / exchange_ratio",
                },
              ]
            : []),
        ]),
        {
          label: "BA Overheads Total",
          value: baOverheadsTotal,
          formula: `sum(${baOverheadDetails.map((d) => d.type.name).join(", ")})`,
        },
        {
          label: "BA Add-on Total",
          value: baAddOnTotal,
          formula: "ba_addon_raw + ba_overheads_total",
        },
      ],
    };
    breakdowns.set("ba_addon_hr", baBreakdown);
  }

  // Calculate COGS (only for DEV)
  let cogsPerRelHour: number | null = null;
  if (category === "DEV" && rawCostPerRelHour !== null) {
    const qaAddOnTotal = breakdowns.get("qa_addon_hr")?.result ?? 0;
    const baAddOnTotal = breakdowns.get("ba_addon_hr")?.result ?? 0;
    cogsPerRelHour = rawCostPerRelHour + qaAddOnTotal + baAddOnTotal;

    const cogsBreakdown: Breakdown = {
      title: "COGS/hr",
      metricKey: "cogs_hr",
      result: cogsPerRelHour,
      currency,
      lines: [
        {
          label: "Dev Cost (Raw)",
          value: rawCostPerRelHour,
          formula: "See 'dev_raw_hr' breakdown",
        },
        {
          label: "QA Add-on Total",
          value: qaAddOnTotal,
          formula: "See 'qa_addon_hr' breakdown",
        },
        {
          label: "BA Add-on Total",
          value: baAddOnTotal,
          formula: "See 'ba_addon_hr' breakdown",
        },
        {
          label: "COGS",
          value: cogsPerRelHour,
          formula: "dev_cost + qa_addon_total + ba_addon_total",
        },
      ],
    };
    breakdowns.set("cogs_hr", cogsBreakdown);
  }

  // Calculate total releaseable cost
  const totalReleaseableCost =
    rawCostPerRelHour !== null && totalOverheads !== null
      ? rawCostPerRelHour + totalOverheads + (category === "DEV" ? (breakdowns.get("qa_addon_hr")?.result ?? 0) + (breakdowns.get("ba_addon_hr")?.result ?? 0) : 0)
      : null;

  if (totalReleaseableCost !== null) {
    const totalBreakdown: Breakdown = {
      title: "Total Releaseable Cost/hr",
      metricKey: "total_releaseable_cost_hr",
      result: totalReleaseableCost,
      currency,
      lines: [
        {
          label: "Dev Cost (Raw)",
          value: rawCostPerRelHour,
          formula: "See 'dev_raw_hr' breakdown",
        },
        {
          label: "Total Overheads",
          value: totalOverheads,
          formula: "See 'total_overheads_hr' breakdown",
        },
        ...(category === "DEV"
          ? [
              {
                label: "QA Add-on Total",
                value: breakdowns.get("qa_addon_hr")?.result ?? 0,
                formula: "See 'qa_addon_hr' breakdown",
              },
              {
                label: "BA Add-on Total",
                value: breakdowns.get("ba_addon_hr")?.result ?? 0,
                formula: "See 'ba_addon_hr' breakdown",
              },
            ]
          : []),
        {
          label: "Total Releaseable Cost",
          value: totalReleaseableCost,
          formula:
            category === "DEV"
              ? "dev_cost + total_overheads + qa_addon + ba_addon"
              : "dev_cost + total_overheads",
        },
      ],
    };
    breakdowns.set("total_releaseable_cost_hr", totalBreakdown);
  }

  // Calculate final price
  const finalPrice = totalReleaseableCost !== null ? totalReleaseableCost * (1 + margin) * (1 + risk) : null;

  if (finalPrice !== null) {
    const finalPriceBreakdown: Breakdown = {
      title: "Final Price/hr",
      metricKey: "final_price_hr",
      result: finalPrice,
      currency,
      lines: [
        {
          label: "Total Releaseable Cost",
          value: totalReleaseableCost,
          formula: "See 'total_releaseable_cost_hr' breakdown",
        },
        {
          label: "Margin",
          value: margin,
          inputs: { setting: "margin" },
        },
        {
          label: "Risk",
          value: risk,
          inputs: { setting: "risk" },
        },
        {
          label: "Final Price",
          value: finalPrice,
          formula: "total_releaseable_cost * (1 + margin) * (1 + risk)",
        },
      ],
    };
    breakdowns.set("final_price_hr", finalPriceBreakdown);
  }

  // Calculate pricing result
  const pricing: PricingResult = {
    devCostPerRelHour: rawCostPerRelHour,
    qaCostPerDevRelHour: category === "DEV" ? breakdowns.get("qa_addon_hr")?.result ?? 0 : 0,
    baCostPerDevRelHour: category === "DEV" ? breakdowns.get("ba_addon_hr")?.result ?? 0 : 0,
    releaseableCost: totalReleaseableCost,
    finalPrice,
  };

  return { pricing, breakdowns };
}
