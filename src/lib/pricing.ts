/**
 * Pricing calculation functions based on SPEC.md
 * Pure functions with clear inputs/outputs
 * All money values are stored in EGP and converted to USD if exchange_ratio is provided
 */

export type EmployeeCategory = "DEV" | "QA" | "BA";

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
function getExchangeRatio(settings: Settings): number | null {
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
 * Calculate employee annual base cost (in EGP, converted to USD if exchange_ratio provided)
 * annualBase = grossMonthly*12 + grossMonthly*12*oncostRate + annualBenefits + annualBonus
 */
export function calculateAnnualBase(
  employee: Employee,
  exchangeRatio: number | null
): number {
  const grossAnnual = employee.grossMonthly * 12;
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
  exchangeRatio: number | null
): number {
  const annualBase = calculateAnnualBase(employee, exchangeRatio);
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
  exchangeRatio: number | null
): number {
  const fullyLoadedAnnual = calculateFullyLoadedAnnual(employee, overheadTypes, exchangeRatio);
  return fullyLoadedAnnual / 12;
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
  if (devEmployees.length === 0) {
    return null;
  }

  const exchangeRatio = getExchangeRatio(settings);
  const devReleasableHoursPerMonth = getSetting(
    settings,
    "dev_releasable_hours_per_month",
    100
  );

  const devMonthlyCost = devEmployees.reduce(
    (sum, emp) => sum + calculateFullyLoadedMonthly(emp, overheadTypes, exchangeRatio),
    0
  );

  const totalFte = devEmployees.reduce((sum, emp) => sum + emp.fte, 0);
  const devHoursCapacity = devReleasableHoursPerMonth * totalFte;

  if (devHoursCapacity === 0) {
    throw new Error(
      "Cannot calculate DEV cost per releaseable hour: devHoursCapacity is zero (no FTE or dev_releasable_hours_per_month is zero)"
    );
  }

  return devMonthlyCost / devHoursCapacity;
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

  const qaMonthlyCost = qaEmployees.reduce(
    (sum, emp) => sum + calculateFullyLoadedMonthly(emp, overheadTypes, exchangeRatio),
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

  const baMonthlyCost = baEmployees.reduce(
    (sum, emp) => sum + calculateFullyLoadedMonthly(emp, overheadTypes, exchangeRatio),
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
 * Main pricing calculation function
 * Computes all pricing metrics for a tech stack
 */
export function calculatePricing(
  techStackId: string,
  allEmployees: Employee[],
  overheadTypes: OverheadType[],
  settings: Settings
): PricingResult {
  // Filter employees by category and tech stack
  const devEmployees = allEmployees.filter(
    (emp) => emp.category === "DEV" && emp.techStackId === techStackId
  );
  const qaEmployees = allEmployees.filter((emp) => emp.category === "QA");
  const baEmployees = allEmployees.filter((emp) => emp.category === "BA");

  // Calculate costs
  const devCostPerRelHour = calculateDevCostPerRelHour(
    devEmployees,
    overheadTypes,
    settings
  );
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

  // Calculate releaseable cost and final price
  const releaseableCost = calculateReleaseableCost(
    devCostPerRelHour,
    qaCostPerDevRelHour,
    baCostPerDevRelHour
  );
  const finalPrice = calculateFinalPrice(releaseableCost, settings);

  return {
    devCostPerRelHour,
    qaCostPerDevRelHour,
    baCostPerDevRelHour,
    releaseableCost,
    finalPrice,
  };
}
