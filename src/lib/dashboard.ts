/**
 * Dashboard-specific helper functions
 * These functions aggregate data for dashboard display
 */

import {
  type Employee,
  type OverheadType,
  type Settings,
  calculateFullyLoadedMonthly,
  calculatePricing,
  getExchangeRatio,
  getAdjustedGrossMonthly,
} from "./pricing";

/**
 * Convert overhead amount to monthly based on period
 */
export function convertToMonthly(amount: number, period: "annual" | "monthly" | "quarterly"): number {
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
 * Calculate total monthly fully-loaded cost for all employees
 */
export function calculateTotalMonthlyCost(
  employees: Employee[],
  overheadTypes: OverheadType[],
  exchangeRatio: number | null,
  annualIncrease: number = 0
): number {
  return employees.reduce((sum, emp) => {
    return sum + calculateFullyLoadedMonthly(emp, overheadTypes, exchangeRatio, annualIncrease);
  }, 0);
}

/**
 * Calculate total overhead monthly equivalent
 * Sum all OverheadType amounts normalized to monthly
 */
export function calculateTotalOverheadMonthly(
  overheadTypes: OverheadType[],
  exchangeRatio: number | null
): number {
  return overheadTypes.reduce((sum, type) => {
    const monthlyEGP = convertToMonthly(type.amount, type.period);
    // Convert to USD if exchange ratio is provided
    if (exchangeRatio && exchangeRatio > 0) {
      return sum + monthlyEGP / exchangeRatio;
    }
    return sum + monthlyEGP;
  }, 0);
}

/**
 * Get allocation sum for an overhead type across all employees
 */
export function getOverheadAllocationSum(
  overheadTypeId: string,
  employees: Employee[]
): number {
  return employees.reduce((sum, emp) => {
    const alloc = emp.overheadAllocs?.find((a) => a.overheadTypeId === overheadTypeId);
    return sum + (alloc?.share ?? 0);
  }, 0);
}

/**
 * Count employees missing allocation for a specific overhead type
 */
export function countEmployeesMissingAllocation(
  overheadTypeId: string,
  employees: Employee[]
): number {
  return employees.filter((emp) => {
    return !emp.overheadAllocs?.some((a) => a.overheadTypeId === overheadTypeId);
  }).length;
}

/**
 * Check if allocation sum is approximately 100% (within 99.5% - 100.5%)
 */
export function isAllocationValid(sum: number): boolean {
  return sum >= 0.995 && sum <= 1.005;
}

/**
 * Get required settings keys
 */
export function getRequiredSettingsKeys(): string[] {
  return [
    "dev_releasable_hours_per_month",
    "standard_hours_per_month",
    "qa_ratio",
    "ba_ratio",
    "margin",
    "risk",
  ];
}

/**
 * Find missing required settings
 */
export function findMissingSettings(settings: Settings): string[] {
  const required = getRequiredSettingsKeys();
  return required.filter((key) => settings[key] === undefined);
}

/**
 * Get setting value with default
 */
function getSetting(settings: Settings, key: string, defaultValue: number): number {
  return settings[key] ?? defaultValue;
}

/**
 * Calculate overhead monthly for a type (in EGP)
 */
export function calculateOverheadMonthly(type: OverheadType): number {
  return convertToMonthly(type.amount, type.period);
}

/**
 * Calculate dev overhead monthly for a stack and overhead type (in EGP)
 * devOverheadMonthly(O,S) = overheadMonthly(O) * sum(share for active DEV employees in stack S)
 */
export function calculateDevOverheadMonthly(
  overheadType: OverheadType,
  stackId: string,
  devEmployees: Employee[]
): number {
  const overheadMonthly = calculateOverheadMonthly(overheadType);
  const shareSum = devEmployees.reduce((sum, emp) => {
    const alloc = emp.overheadAllocs?.find((a) => a.overheadTypeId === overheadType.id);
    return sum + (alloc?.share ?? 0);
  }, 0);
  return overheadMonthly * shareSum;
}

/**
 * Calculate dev capacity hours for a stack
 * devCapacityHours(S) = dev_releasable_hours_per_month * sum(fte for active DEV employees in stack S)
 */
export function calculateDevCapacityHours(
  stackId: string,
  devEmployees: Employee[],
  settings: Settings
): number {
  const devReleasableHoursPerMonth = getSetting(settings, "dev_releasable_hours_per_month", 100);
  const totalFte = devEmployees.reduce((sum, emp) => sum + emp.fte, 0);
  return devReleasableHoursPerMonth * totalFte;
}

/**
 * Calculate capacity hours for AGENTIC_AI in a stack
 * agenticCapacityHours(S) = dev_releasable_hours_per_month * sum(fte for active AGENTIC_AI employees in stack S)
 */
export function calculateAgenticCapacityHours(
  stackId: string,
  agenticEmployees: Employee[],
  settings: Settings
): number {
  const devReleasableHoursPerMonth = getSetting(settings, "dev_releasable_hours_per_month", 100);
  const totalFte = agenticEmployees.reduce((sum, emp) => sum + emp.fte, 0);
  return devReleasableHoursPerMonth * totalFte;
}

/**
 * Calculate overhead per releaseable hour for AGENTIC_AI in a stack (in USD if exchange ratio provided, else EGP)
 * Returns null if capacity is zero
 */
export function calculateAgenticOverheadPerRelHour(
  overheadType: OverheadType,
  stackId: string,
  agenticEmployees: Employee[],
  settings: Settings
): number | null {
  const capacityHours = calculateAgenticCapacityHours(stackId, agenticEmployees, settings);
  if (capacityHours === 0) {
    return null;
  }
  const overheadMonthly = calculateOverheadMonthly(overheadType);
  const shareSum = agenticEmployees.reduce((sum, emp) => {
    const alloc = emp.overheadAllocs?.find((a) => a.overheadTypeId === overheadType.id);
    return sum + (alloc?.share ?? 0);
  }, 0);
  const overheadPerHourEGP = (overheadMonthly * shareSum) / capacityHours;
  const exchangeRatio = getExchangeRatio(settings);
  if (exchangeRatio && exchangeRatio > 0) {
    return overheadPerHourEGP / exchangeRatio;
  }
  return overheadPerHourEGP;
}

/**
 * Calculate overhead per releaseable hour for a stack and overhead type (in USD if exchange ratio provided, else EGP)
 * Returns null if capacity is zero
 */
export function calculateOverheadPerRelHour(
  overheadType: OverheadType,
  stackId: string,
  devEmployees: Employee[],
  settings: Settings
): number | null {
  const devCapacityHours = calculateDevCapacityHours(stackId, devEmployees, settings);
  if (devCapacityHours === 0) {
    return null;
  }
  const devOverheadMonthly = calculateDevOverheadMonthly(overheadType, stackId, devEmployees);
  const overheadPerHourEGP = devOverheadMonthly / devCapacityHours;
  const exchangeRatio = getExchangeRatio(settings);
  if (exchangeRatio && exchangeRatio > 0) {
    return overheadPerHourEGP / exchangeRatio;
  }
  return overheadPerHourEGP;
}

/**
 * Calculate QA overhead monthly for an overhead type (in EGP)
 * qaOverheadMonthly(O) = overheadMonthly(O) * sum(share for active QA employees)
 */
export function calculateQaOverheadMonthly(
  overheadType: OverheadType,
  qaEmployees: Employee[]
): number {
  const overheadMonthly = calculateOverheadMonthly(overheadType);
  const shareSum = qaEmployees.reduce((sum, emp) => {
    const alloc = emp.overheadAllocs?.find((a) => a.overheadTypeId === overheadType.id);
    return sum + (alloc?.share ?? 0);
  }, 0);
  return overheadMonthly * shareSum;
}

/**
 * Calculate QA add-on per releaseable hour for an overhead type (in USD if exchange ratio provided, else EGP)
 * qaPerQaHour = qaOverheadMonthly(O) / standard_hours_per_month
 * qaAddOn = qa_ratio * qaPerQaHour
 */
export function calculateQaAddOnPerRelHour(
  overheadType: OverheadType,
  qaEmployees: Employee[],
  settings: Settings
): number {
  const qaOverheadMonthly = calculateQaOverheadMonthly(overheadType, qaEmployees);
  const standardHoursPerMonth = getSetting(settings, "standard_hours_per_month", 160);
  if (standardHoursPerMonth === 0) {
    return 0;
  }
  const qaPerQaHour = qaOverheadMonthly / standardHoursPerMonth;
  const qaRatio = getSetting(settings, "qa_ratio", 0.5);
  const qaAddOnEGP = qaRatio * qaPerQaHour;
  const exchangeRatio = getExchangeRatio(settings);
  if (exchangeRatio && exchangeRatio > 0) {
    return qaAddOnEGP / exchangeRatio;
  }
  return qaAddOnEGP;
}

/**
 * Calculate BA overhead monthly for an overhead type (in EGP)
 * baOverheadMonthly(O) = overheadMonthly(O) * sum(share for active BA employees)
 */
export function calculateBaOverheadMonthly(
  overheadType: OverheadType,
  baEmployees: Employee[]
): number {
  const overheadMonthly = calculateOverheadMonthly(overheadType);
  const shareSum = baEmployees.reduce((sum, emp) => {
    const alloc = emp.overheadAllocs?.find((a) => a.overheadTypeId === overheadType.id);
    return sum + (alloc?.share ?? 0);
  }, 0);
  return overheadMonthly * shareSum;
}

/**
 * Calculate BA add-on per releaseable hour for an overhead type (in USD if exchange ratio provided, else EGP)
 * baPerBaHour = baOverheadMonthly(O) / standard_hours_per_month
 * baAddOn = ba_ratio * baPerBaHour
 */
export function calculateBaAddOnPerRelHour(
  overheadType: OverheadType,
  baEmployees: Employee[],
  settings: Settings
): number {
  const baOverheadMonthly = calculateBaOverheadMonthly(overheadType, baEmployees);
  const standardHoursPerMonth = getSetting(settings, "standard_hours_per_month", 160);
  if (standardHoursPerMonth === 0) {
    return 0;
  }
  const baPerBaHour = baOverheadMonthly / standardHoursPerMonth;
  const baRatio = getSetting(settings, "ba_ratio", 0.25);
  const baAddOnEGP = baRatio * baPerBaHour;
  const exchangeRatio = getExchangeRatio(settings);
  if (exchangeRatio && exchangeRatio > 0) {
    return baAddOnEGP / exchangeRatio;
  }
  return baAddOnEGP;
}

/**
 * Calculate raw monthly cost for an employee (salary + oncost + benefits + bonus, NO overhead)
 * rawMonthly = adjustedGrossMonthly * (1 + oncostRate) + (annualBenefits / 12) + (annualBonus / 12)
 * where adjustedGrossMonthly = grossMonthly * (1 + annualIncrease)
 */
export function calculateRawMonthly(employee: Employee, annualIncrease: number = 0): number {
  const { getAdjustedGrossMonthly } = require("@/lib/pricing");
  const adjustedGrossMonthly = getAdjustedGrossMonthly(employee, annualIncrease);
  const oncostRate = employee.oncostRate ?? 0;
  const annualBenefits = employee.annualBenefits ?? 0;
  const annualBonus = employee.annualBonus ?? 0;
  return adjustedGrossMonthly * (1 + oncostRate) + annualBenefits / 12 + annualBonus / 12;
}

/**
 * Calculate raw cost per releaseable hour for a category in a stack (in USD if exchange ratio provided, else EGP)
 * Returns null if capacity is zero
 */
export function calculateRawCostPerRelHour(
  stackId: string,
  categoryEmployees: Employee[],
  settings: Settings
): number | null {
  const devReleasableHoursPerMonth = getSetting(settings, "dev_releasable_hours_per_month", 100);
  const totalFte = categoryEmployees.reduce((sum, emp) => sum + emp.fte, 0);
  const capacityHours = devReleasableHoursPerMonth * totalFte;
  
  if (capacityHours === 0) {
    return null;
  }

  const annualIncrease = getSetting(settings, "annual_increase", 0);
  const rawMonthlyTotal = categoryEmployees.reduce((sum, emp) => sum + calculateRawMonthly(emp, annualIncrease), 0);
  const rawCostPerHourEGP = rawMonthlyTotal / capacityHours;
  
  const exchangeRatio = getExchangeRatio(settings);
  if (exchangeRatio && exchangeRatio > 0) {
    return rawCostPerHourEGP / exchangeRatio;
  }
  return rawCostPerHourEGP;
}

/**
 * Calculate QA raw cost per releaseable hour (in USD if exchange ratio provided, else EGP)
 * qaRawMonthly = sum(rawMonthly for active QA employees)
 * qaRawPerQaHour = qaRawMonthly / standard_hours_per_month
 * qaAddOnPerRelHour = qa_ratio * qaRawPerQaHour
 */
export function calculateQaRawAddOnPerRelHour(
  qaEmployees: Employee[],
  settings: Settings
): number {
  if (qaEmployees.length === 0) {
    return 0;
  }
  
  const annualIncrease = getSetting(settings, "annual_increase", 0);
  const qaRawMonthly = qaEmployees.reduce((sum, emp) => sum + calculateRawMonthly(emp, annualIncrease), 0);
  const standardHoursPerMonth = getSetting(settings, "standard_hours_per_month", 160);
  
  if (standardHoursPerMonth === 0) {
    return 0;
  }
  
  const qaRawPerQaHour = qaRawMonthly / standardHoursPerMonth;
  const qaRatio = getSetting(settings, "qa_ratio", 0.5);
  const qaAddOnEGP = qaRatio * qaRawPerQaHour;
  
  const exchangeRatio = getExchangeRatio(settings);
  if (exchangeRatio && exchangeRatio > 0) {
    return qaAddOnEGP / exchangeRatio;
  }
  return qaAddOnEGP;
}

/**
 * Calculate BA raw cost per releaseable hour (in USD if exchange ratio provided, else EGP)
 * baRawMonthly = sum(rawMonthly for active BA employees)
 * baRawPerBaHour = baRawMonthly / standard_hours_per_month
 * baAddOnPerRelHour = ba_ratio * baRawPerBaHour
 */
export function calculateBaRawAddOnPerRelHour(
  baEmployees: Employee[],
  settings: Settings
): number {
  if (baEmployees.length === 0) {
    return 0;
  }
  
  const annualIncrease = getSetting(settings, "annual_increase", 0);
  const baRawMonthly = baEmployees.reduce((sum, emp) => sum + calculateRawMonthly(emp, annualIncrease), 0);
  const standardHoursPerMonth = getSetting(settings, "standard_hours_per_month", 160);
  
  if (standardHoursPerMonth === 0) {
    return 0;
  }
  
  const baRawPerBaHour = baRawMonthly / standardHoursPerMonth;
  const baRatio = getSetting(settings, "ba_ratio", 0.25);
  const baAddOnEGP = baRatio * baRawPerBaHour;
  
  const exchangeRatio = getExchangeRatio(settings);
  if (exchangeRatio && exchangeRatio > 0) {
    return baAddOnEGP / exchangeRatio;
  }
  return baAddOnEGP;
}

/**
 * Compute global QA add-on per releaseable hour (raw + overheads)
 * Returns { raw: number, overheads: number[], total: number }
 */
export function computeGlobalQaAddOnPerReleaseHr(
  qaEmployees: Employee[],
  overheadTypes: OverheadType[],
  settings: Settings
): {
  raw: number;
  overheads: number[];
  total: number;
} {
  const raw = calculateQaRawAddOnPerRelHour(qaEmployees, settings);
  const overheads = overheadTypes.map((type) =>
    calculateQaAddOnPerRelHour(type, qaEmployees, settings)
  );
  const total = raw + overheads.reduce((sum, val) => sum + val, 0);
  return { raw, overheads, total };
}

/**
 * Compute global BA add-on per releaseable hour (raw + overheads)
 * Returns { raw: number, overheads: number[], total: number }
 */
export function computeGlobalBaAddOnPerReleaseHr(
  baEmployees: Employee[],
  overheadTypes: OverheadType[],
  settings: Settings
): {
  raw: number;
  overheads: number[];
  total: number;
} {
  const raw = calculateBaRawAddOnPerRelHour(baEmployees, settings);
  const overheads = overheadTypes.map((type) =>
    calculateBaAddOnPerRelHour(type, baEmployees, settings)
  );
  const total = raw + overheads.reduce((sum, val) => sum + val, 0);
  return { raw, overheads, total };
}

/**
 * Compute DEV stack row data
 * Returns { rawCost, overheads, totalOverheads, qaAddOn, baAddOn, totalReleaseableCost } or null if capacity is 0
 */
export function computeDevStackRow(
  stackId: string,
  devEmployees: Employee[],
  overheadTypes: OverheadType[],
  qaAddOn: number,
  baAddOn: number,
  settings: Settings
): {
  rawCost: number | null;
  overheads: (number | null)[];
  totalOverheads: number;
  qaAddOn: number;
  baAddOn: number;
  totalReleaseableCost: number | null;
} | null {
  const capacity = calculateDevCapacityHours(stackId, devEmployees, settings);
  if (capacity === 0) {
    return null;
  }

  const rawCost = calculateRawCostPerRelHour(stackId, devEmployees, settings);
  const overheads = overheadTypes.map((type) =>
    calculateOverheadPerRelHour(type, stackId, devEmployees, settings)
  );
  const totalOverheads = overheads.reduce((sum: number, val) => sum + (val ?? 0), 0);
  const totalReleaseableCost =
    rawCost !== null ? rawCost + totalOverheads + qaAddOn + baAddOn : null;

  return {
    rawCost,
    overheads,
    totalOverheads,
    qaAddOn,
    baAddOn,
    totalReleaseableCost,
  };
}

/**
 * Compute AGENTIC_AI stack row data
 * Returns { rawCost, overheads, totalOverheads, totalReleaseableCost } or null if capacity is 0
 */
export function computeAgenticStackRow(
  stackId: string,
  agenticEmployees: Employee[],
  overheadTypes: OverheadType[],
  settings: Settings
): {
  rawCost: number | null;
  overheads: (number | null)[];
  totalOverheads: number;
  totalReleaseableCost: number | null;
} | null {
  const capacity = calculateAgenticCapacityHours(stackId, agenticEmployees, settings);
  if (capacity === 0) {
    return null;
  }

  const rawCost = calculateRawCostPerRelHour(stackId, agenticEmployees, settings);
  const overheads = overheadTypes.map((type) =>
    calculateAgenticOverheadPerRelHour(type, stackId, agenticEmployees, settings)
  );
  const totalOverheads = overheads.reduce((sum: number, val) => sum + (val ?? 0), 0);
  const totalReleaseableCost = rawCost !== null ? rawCost + totalOverheads : null;

  return {
    rawCost,
    overheads,
    totalOverheads,
    totalReleaseableCost,
  };
}

