/**
 * Pricing calculation functions based on SPEC.md
 * Pure functions with clear inputs/outputs
 */

export type EmployeeCategory = "DEV" | "QA" | "BA";

export interface Employee {
  id: string;
  name: string;
  category: EmployeeCategory;
  techStackId: string | null;
  grossMonthly: number;
  netMonthly: number;
  oncostRate: number | null;
  annualBenefits: number | null;
  annualBonus: number | null;
  fte: number;
  overheadAlloc?: {
    mgmtShare: number;
    companyShare: number;
  } | null;
}

export interface OverheadPool {
  managementOverheadAnnual: number;
  companyOverheadAnnual: number;
}

export interface Assumptions {
  devReleasableHoursPerMonth: number;
  standardHoursPerMonth: number;
  qaRatio: number;
  baRatio: number;
  margin: number;
  risk: number;
}

export interface PricingResult {
  devCostPerRelHour: number | null;
  qaCostPerDevRelHour: number;
  baCostPerDevRelHour: number;
  releaseableCost: number | null;
  finalPrice: number | null;
}

/**
 * Calculate employee annual base cost
 * annualBase = grossMonthly*12 + grossMonthly*12*oncostRate + annualBenefits + annualBonus
 */
export function calculateAnnualBase(employee: Employee): number {
  const grossAnnual = employee.grossMonthly * 12;
  const oncostAmount = employee.oncostRate
    ? grossAnnual * employee.oncostRate
    : 0;
  const benefits = employee.annualBenefits ?? 0;
  const bonus = employee.annualBonus ?? 0;

  return grossAnnual + oncostAmount + benefits + bonus;
}

/**
 * Calculate allocated overhead to employee
 * allocatedOverhead = mgmtPoolAnnual*mgmtShare + companyPoolAnnual*companyShare
 */
export function calculateAllocatedOverhead(
  employee: Employee,
  overheadPool: OverheadPool
): number {
  if (!employee.overheadAlloc) {
    return 0;
  }

  const mgmtAllocation =
    overheadPool.managementOverheadAnnual * employee.overheadAlloc.mgmtShare;
  const companyAllocation =
    overheadPool.companyOverheadAnnual * employee.overheadAlloc.companyShare;

  return mgmtAllocation + companyAllocation;
}

/**
 * Calculate fully loaded annual cost
 * fullyLoadedAnnual = annualBase + allocatedOverhead
 */
export function calculateFullyLoadedAnnual(
  employee: Employee,
  overheadPool: OverheadPool
): number {
  const annualBase = calculateAnnualBase(employee);
  const allocatedOverhead = calculateAllocatedOverhead(employee, overheadPool);
  return annualBase + allocatedOverhead;
}

/**
 * Calculate fully loaded monthly cost
 * fullyLoadedMonthly = fullyLoadedAnnual / 12
 */
export function calculateFullyLoadedMonthly(
  employee: Employee,
  overheadPool: OverheadPool
): number {
  const fullyLoadedAnnual = calculateFullyLoadedAnnual(employee, overheadPool);
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
  overheadPool: OverheadPool,
  assumptions: Assumptions
): number | null {
  if (devEmployees.length === 0) {
    return null;
  }

  const devMonthlyCost = devEmployees.reduce(
    (sum, emp) => sum + calculateFullyLoadedMonthly(emp, overheadPool),
    0
  );

  const totalFte = devEmployees.reduce((sum, emp) => sum + emp.fte, 0);
  const devHoursCapacity =
    assumptions.devReleasableHoursPerMonth * totalFte;

  if (devHoursCapacity === 0) {
    throw new Error(
      "Cannot calculate DEV cost per releaseable hour: devHoursCapacity is zero (no FTE or devReleasableHoursPerMonth is zero)"
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
  overheadPool: OverheadPool,
  assumptions: Assumptions
): number {
  if (qaEmployees.length === 0) {
    return 0; // Missing QA team treated as 0 cost
  }

  const qaMonthlyCost = qaEmployees.reduce(
    (sum, emp) => sum + calculateFullyLoadedMonthly(emp, overheadPool),
    0
  );

  if (assumptions.standardHoursPerMonth === 0) {
    throw new Error(
      "Cannot calculate QA cost per dev releaseable hour: standardHoursPerMonth is zero"
    );
  }

  const qaCostPerQaHour = qaMonthlyCost / assumptions.standardHoursPerMonth;
  return assumptions.qaRatio * qaCostPerQaHour;
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
  overheadPool: OverheadPool,
  assumptions: Assumptions
): number {
  if (baEmployees.length === 0) {
    return 0; // Missing BA team treated as 0 cost
  }

  const baMonthlyCost = baEmployees.reduce(
    (sum, emp) => sum + calculateFullyLoadedMonthly(emp, overheadPool),
    0
  );

  if (assumptions.standardHoursPerMonth === 0) {
    throw new Error(
      "Cannot calculate BA cost per dev releaseable hour: standardHoursPerMonth is zero"
    );
  }

  const baCostPerBaHour = baMonthlyCost / assumptions.standardHoursPerMonth;
  return assumptions.baRatio * baCostPerBaHour;
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
  assumptions: Assumptions
): number | null {
  if (releaseableCost === null) {
    return null;
  }

  return releaseableCost * (1 + assumptions.margin) * (1 + assumptions.risk);
}

/**
 * Main pricing calculation function
 * Computes all pricing metrics for a tech stack
 */
export function calculatePricing(
  techStackId: string,
  allEmployees: Employee[],
  overheadPool: OverheadPool,
  assumptions: Assumptions
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
    overheadPool,
    assumptions
  );
  const qaCostPerDevRelHour = calculateQaCostPerDevRelHour(
    qaEmployees,
    overheadPool,
    assumptions
  );
  const baCostPerDevRelHour = calculateBaCostPerDevRelHour(
    baEmployees,
    overheadPool,
    assumptions
  );

  // Calculate releaseable cost and final price
  const releaseableCost = calculateReleaseableCost(
    devCostPerRelHour,
    qaCostPerDevRelHour,
    baCostPerDevRelHour
  );
  const finalPrice = calculateFinalPrice(releaseableCost, assumptions);

  return {
    devCostPerRelHour,
    qaCostPerDevRelHour,
    baCostPerDevRelHour,
    releaseableCost,
    finalPrice,
  };
}

