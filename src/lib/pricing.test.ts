import { describe, it, expect } from "vitest";
import {
  calculatePricing,
  calculateDevCostPerRelHour,
  calculateQaCostPerDevRelHour,
  calculateBaCostPerDevRelHour,
  calculateReleaseableCost,
  type Employee,
  type OverheadPool,
  type Assumptions,
} from "./pricing";

describe("pricing calculations", () => {
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
    fte: number = 1.0
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
    overheadAlloc: {
      mgmtShare: 0.1,
      companyShare: 0.2,
    },
  });

  const createQaEmployee = (grossMonthly: number = 8000): Employee => ({
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
    overheadAlloc: {
      mgmtShare: 0.1,
      companyShare: 0.2,
    },
  });

  const createBaEmployee = (grossMonthly: number = 9000): Employee => ({
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
    overheadAlloc: {
      mgmtShare: 0.1,
      companyShare: 0.2,
    },
  });

  describe("devReleasableHoursPerMonth 100 -> 120 reduces devCostPerRelHour", () => {
    it("should reduce devCostPerRelHour when devReleasableHoursPerMonth increases", () => {
      const techStackId = "stack-1";
      const devEmployee = createDevEmployee(techStackId, 10000, 1.0);

      const assumptions100: Assumptions = {
        ...baseAssumptions,
        devReleasableHoursPerMonth: 100,
      };

      const assumptions120: Assumptions = {
        ...baseAssumptions,
        devReleasableHoursPerMonth: 120,
      };

      const cost100 = calculateDevCostPerRelHour(
        [devEmployee],
        baseOverheadPool,
        assumptions100
      );

      const cost120 = calculateDevCostPerRelHour(
        [devEmployee],
        baseOverheadPool,
        assumptions120
      );

      expect(cost100).not.toBeNull();
      expect(cost120).not.toBeNull();
      expect(cost120!).toBeLessThan(cost100!);
    });
  });

  describe("increasing qaRatio increases releaseableCost", () => {
    it("should increase releaseableCost when qaRatio increases", () => {
      const techStackId = "stack-1";
      const devEmployee = createDevEmployee(techStackId);
      const qaEmployee = createQaEmployee();

      const assumptionsLow: Assumptions = {
        ...baseAssumptions,
        qaRatio: 0.3,
      };

      const assumptionsHigh: Assumptions = {
        ...baseAssumptions,
        qaRatio: 0.7,
      };

      // Calculate dev cost (same for both)
      const devCost = calculateDevCostPerRelHour(
        [devEmployee],
        baseOverheadPool,
        baseAssumptions
      );

      // Calculate QA costs with different ratios
      const qaCostLow = calculateQaCostPerDevRelHour(
        [qaEmployee],
        baseOverheadPool,
        assumptionsLow
      );

      const qaCostHigh = calculateQaCostPerDevRelHour(
        [qaEmployee],
        baseOverheadPool,
        assumptionsHigh
      );

      // Calculate releaseable costs
      const releaseableCostLow = calculateReleaseableCost(
        devCost,
        qaCostLow,
        0 // no BA for simplicity
      );

      const releaseableCostHigh = calculateReleaseableCost(
        devCost,
        qaCostHigh,
        0 // no BA for simplicity
      );

      expect(releaseableCostLow).not.toBeNull();
      expect(releaseableCostHigh).not.toBeNull();
      expect(releaseableCostHigh!).toBeGreaterThan(releaseableCostLow!);
    });
  });

  describe("increasing overhead pools increases costs", () => {
    it("should increase devCostPerRelHour when overhead pools increase", () => {
      const techStackId = "stack-1";
      const devEmployee = createDevEmployee(techStackId);

      const lowOverheadPool: OverheadPool = {
        managementOverheadAnnual: 50000,
        companyOverheadAnnual: 100000,
      };

      const highOverheadPool: OverheadPool = {
        managementOverheadAnnual: 200000,
        companyOverheadAnnual: 400000,
      };

      const costLow = calculateDevCostPerRelHour(
        [devEmployee],
        lowOverheadPool,
        baseAssumptions
      );

      const costHigh = calculateDevCostPerRelHour(
        [devEmployee],
        highOverheadPool,
        baseAssumptions
      );

      expect(costLow).not.toBeNull();
      expect(costHigh).not.toBeNull();
      expect(costHigh!).toBeGreaterThan(costLow!);
    });

    it("should increase QA cost when overhead pools increase", () => {
      const qaEmployee = createQaEmployee();

      const lowOverheadPool: OverheadPool = {
        managementOverheadAnnual: 50000,
        companyOverheadAnnual: 100000,
      };

      const highOverheadPool: OverheadPool = {
        managementOverheadAnnual: 200000,
        companyOverheadAnnual: 400000,
      };

      const costLow = calculateQaCostPerDevRelHour(
        [qaEmployee],
        lowOverheadPool,
        baseAssumptions
      );

      const costHigh = calculateQaCostPerDevRelHour(
        [qaEmployee],
        highOverheadPool,
        baseAssumptions
      );

      expect(costHigh).toBeGreaterThan(costLow);
    });
  });

  describe("edge cases", () => {
    it("should handle missing QA team (return 0 cost)", () => {
      const qaCost = calculateQaCostPerDevRelHour(
        [],
        baseOverheadPool,
        baseAssumptions
      );

      expect(qaCost).toBe(0);
    });

    it("should handle missing BA team (return 0 cost)", () => {
      const baCost = calculateBaCostPerDevRelHour(
        [],
        baseOverheadPool,
        baseAssumptions
      );

      expect(baCost).toBe(0);
    });

    it("should return null for devCostPerRelHour when no DEV employees", () => {
      const cost = calculateDevCostPerRelHour(
        [],
        baseOverheadPool,
        baseAssumptions
      );

      expect(cost).toBeNull();
    });

    it("should throw error when devHoursCapacity is zero", () => {
      const techStackId = "stack-1";
      const devEmployee = createDevEmployee(techStackId, 10000, 0); // 0 FTE

      const assumptions: Assumptions = {
        ...baseAssumptions,
        devReleasableHoursPerMonth: 100,
      };

      expect(() => {
        calculateDevCostPerRelHour([devEmployee], baseOverheadPool, assumptions);
      }).toThrow("devHoursCapacity is zero");
    });

    it("should throw error when standardHoursPerMonth is zero for QA", () => {
      const qaEmployee = createQaEmployee();

      const assumptions: Assumptions = {
        ...baseAssumptions,
        standardHoursPerMonth: 0,
      };

      expect(() => {
        calculateQaCostPerDevRelHour([qaEmployee], baseOverheadPool, assumptions);
      }).toThrow("standardHoursPerMonth is zero");
    });
  });
});

