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
  exchangeRatio: number | null
): number {
  return employees.reduce((sum, emp) => {
    return sum + calculateFullyLoadedMonthly(emp, overheadTypes, exchangeRatio);
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

