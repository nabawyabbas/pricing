import { describe, it, expect } from "vitest";
import {
  calculatePricing,
  calculateDevCostPerRelHour,
  calculateQaCostPerDevRelHour,
  calculateBaCostPerDevRelHour,
  calculateFullyLoadedMonthly,
  type Employee,
  type OverheadPool,
  type Assumptions,
} from "./pricing";

describe("pricing edge cases", () => {
  const baseOverheadPool: OverheadPool = {
    managementOverheadAnnual: 100000,
    companyOverheadAnnual: 200000,
  };

  const baseAssumptions: Assumptions = {
    devReleasableHoursPerMonth: 100,
    standardHoursPerMonth: 160,
    qaRatio: 0.5,
    baRatio: 0.25,
    margin: 0.2,
    risk: 0.1,
  };

  const createDevEmployee = (
    techStackId: string,
    grossMonthly: number = 10000,
    fte: number = 1.0,
    hasOverheadAlloc: boolean = true
  ): Employee => ({
    id: `dev-${techStackId}`,
    name: "Dev Employee",
    category: "DEV",
    techStackId,
    grossMonthly,
    netMonthly: grossMonthly * 0.7,
    oncostRate: 0.1,
    annualBenefits: 5000,
    annualBonus: 10000,
    fte,
    overheadAlloc: hasOverheadAlloc
      ? {
          mgmtShare: 0.1,
          companyShare: 0.2,
        }
      : null,
  });

  const createQaEmployee = (grossMonthly: number = 8000, hasOverheadAlloc: boolean = true): Employee => ({
    id: "qa-1",
    name: "QA Employee",
    category: "QA",
    techStackId: null,
    grossMonthly,
    netMonthly: grossMonthly * 0.7,
    oncostRate: 0.1,
    annualBenefits: 5000,
    annualBonus: 5000,
    fte: 1.0,
    overheadAlloc: hasOverheadAlloc
      ? {
          mgmtShare: 0.1,
          companyShare: 0.2,
        }
      : null,
  });

  const createBaEmployee = (grossMonthly: number = 9000, hasOverheadAlloc: boolean = true): Employee => ({
    id: "ba-1",
    name: "BA Employee",
    category: "BA",
    techStackId: null,
    grossMonthly,
    netMonthly: grossMonthly * 0.7,
    oncostRate: 0.1,
    annualBenefits: 5000,
    annualBonus: 5000,
    fte: 1.0,
    overheadAlloc: hasOverheadAlloc
      ? {
          mgmtShare: 0.1,
          companyShare: 0.2,
        }
      : null,
  });

  describe("empty teams", () => {
    it("should handle empty QA team - returns 0 cost", () => {
      const qaCost = calculateQaCostPerDevRelHour([], baseOverheadPool, baseAssumptions);
      expect(qaCost).toBe(0);
    });

    it("should handle empty BA team - returns 0 cost", () => {
      const baCost = calculateBaCostPerDevRelHour([], baseOverheadPool, baseAssumptions);
      expect(baCost).toBe(0);
    });

    it("should handle both empty QA and BA teams", () => {
      const techStackId = "stack-1";
      const devEmployee = createDevEmployee(techStackId);

      const result = calculatePricing(
        techStackId,
        [devEmployee],
        baseOverheadPool,
        baseAssumptions
      );

      expect(result.qaCostPerDevRelHour).toBe(0);
      expect(result.baCostPerDevRelHour).toBe(0);
      expect(result.devCostPerRelHour).not.toBeNull();
      expect(result.releaseableCost).not.toBeNull();
      expect(result.finalPrice).not.toBeNull();
    });
  });

  describe("zero devs in a stack", () => {
    it("should return null for devCostPerRelHour when no DEV employees in stack", () => {
      const techStackId = "stack-1";
      const cost = calculateDevCostPerRelHour([], baseOverheadPool, baseAssumptions);
      expect(cost).toBeNull();
    });

    it("should return null for releaseableCost and finalPrice when no DEV employees", () => {
      const techStackId = "stack-1";
      const qaEmployee = createQaEmployee();
      const baEmployee = createBaEmployee();

      const result = calculatePricing(
        techStackId,
        [qaEmployee, baEmployee],
        baseOverheadPool,
        baseAssumptions
      );

      expect(result.devCostPerRelHour).toBeNull();
      expect(result.releaseableCost).toBeNull();
      expect(result.finalPrice).toBeNull();
      // QA and BA costs should still be calculated
      expect(result.qaCostPerDevRelHour).toBeGreaterThan(0);
      expect(result.baCostPerDevRelHour).toBeGreaterThan(0);
    });

    it("should handle stack with no employees at all", () => {
      const techStackId = "stack-1";
      const result = calculatePricing(
        techStackId,
        [],
        baseOverheadPool,
        baseAssumptions
      );

      expect(result.devCostPerRelHour).toBeNull();
      expect(result.qaCostPerDevRelHour).toBe(0);
      expect(result.baCostPerDevRelHour).toBe(0);
      expect(result.releaseableCost).toBeNull();
      expect(result.finalPrice).toBeNull();
    });
  });

  describe("missing overhead allocations", () => {
    it("should handle employee with no overheadAlloc - returns 0 allocated overhead", () => {
      const employee = createDevEmployee("stack-1", 10000, 1.0, false);
      const monthlyCost = calculateFullyLoadedMonthly(employee, baseOverheadPool);

      // Should still calculate base cost, just no overhead
      expect(monthlyCost).toBeGreaterThan(0);
      
      // Calculate what it should be without overhead
      const grossAnnual = employee.grossMonthly * 12;
      const oncostAmount = grossAnnual * (employee.oncostRate ?? 0);
      const benefits = employee.annualBenefits ?? 0;
      const bonus = employee.annualBonus ?? 0;
      const annualBase = grossAnnual + oncostAmount + benefits + bonus;
      const expectedMonthly = annualBase / 12;

      expect(monthlyCost).toBeCloseTo(expectedMonthly, 2);
    });

    it("should handle QA employee with no overheadAlloc", () => {
      const qaEmployee = createQaEmployee(8000, false);
      const qaCost = calculateQaCostPerDevRelHour(
        [qaEmployee],
        baseOverheadPool,
        baseAssumptions
      );

      // Should still calculate cost, just without overhead
      expect(qaCost).toBeGreaterThan(0);
    });

    it("should handle BA employee with no overheadAlloc", () => {
      const baEmployee = createBaEmployee(9000, false);
      const baCost = calculateBaCostPerDevRelHour(
        [baEmployee],
        baseOverheadPool,
        baseAssumptions
      );

      // Should still calculate cost, just without overhead
      expect(baCost).toBeGreaterThan(0);
    });

    it("should handle mixed employees - some with overheadAlloc, some without", () => {
      const techStackId = "stack-1";
      const devWithOverhead = createDevEmployee(techStackId, 10000, 1.0, true);
      const devWithoutOverhead = createDevEmployee(techStackId, 12000, 1.0, false);

      const result = calculatePricing(
        techStackId,
        [devWithOverhead, devWithoutOverhead],
        baseOverheadPool,
        baseAssumptions
      );

      // Should calculate successfully
      expect(result.devCostPerRelHour).not.toBeNull();
      expect(result.releaseableCost).not.toBeNull();
      expect(result.finalPrice).not.toBeNull();
    });
  });

  describe("combined edge cases", () => {
    it("should handle empty QA/BA teams + zero devs in stack", () => {
      const techStackId = "stack-1";
      const result = calculatePricing(
        techStackId,
        [],
        baseOverheadPool,
        baseAssumptions
      );

      expect(result.devCostPerRelHour).toBeNull();
      expect(result.qaCostPerDevRelHour).toBe(0);
      expect(result.baCostPerDevRelHour).toBe(0);
      expect(result.releaseableCost).toBeNull();
      expect(result.finalPrice).toBeNull();
    });

    it("should handle zero devs + missing overhead allocations", () => {
      const techStackId = "stack-1";
      const qaEmployee = createQaEmployee(8000, false);
      const baEmployee = createBaEmployee(9000, false);

      const result = calculatePricing(
        techStackId,
        [qaEmployee, baEmployee],
        baseOverheadPool,
        baseAssumptions
      );

      expect(result.devCostPerRelHour).toBeNull();
      expect(result.qaCostPerDevRelHour).toBeGreaterThan(0);
      expect(result.baCostPerDevRelHour).toBeGreaterThan(0);
      expect(result.releaseableCost).toBeNull();
      expect(result.finalPrice).toBeNull();
    });

    it("should handle all edge cases together", () => {
      const techStackId = "stack-1";
      // Empty QA/BA teams, zero devs, but overhead pool exists
      const result = calculatePricing(
        techStackId,
        [],
        baseOverheadPool,
        baseAssumptions
      );

      expect(result.devCostPerRelHour).toBeNull();
      expect(result.qaCostPerDevRelHour).toBe(0);
      expect(result.baCostPerDevRelHour).toBe(0);
      expect(result.releaseableCost).toBeNull();
      expect(result.finalPrice).toBeNull();
    });
  });
});

