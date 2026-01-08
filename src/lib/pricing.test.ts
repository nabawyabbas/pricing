import { describe, it, expect } from "vitest";
import {
  calculatePricing,
  calculatePricingForCategory,
  calculateDevCostPerRelHour,
  calculateQaCostPerDevRelHour,
  calculateBaCostPerDevRelHour,
  calculateReleaseableCost,
  calculateAnnualBase,
  type Employee,
  type OverheadType,
  type Settings,
} from "./pricing";

describe("pricing calculations", () => {
  const baseOverheadTypes: OverheadType[] = [
    {
      id: "overhead-mgmt",
      name: "Management",
      amount: 100000,
      period: "annual",
    },
    {
      id: "overhead-company",
      name: "Company",
      amount: 200000,
      period: "annual",
    },
  ];

  const baseSettings: Settings = {
    dev_releasable_hours_per_month: 100,
    standard_hours_per_month: 160,
    qa_ratio: 0.5,
    ba_ratio: 0.25,
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
    overheadAllocs: [
      { overheadTypeId: "overhead-mgmt", share: 0.1 },
      { overheadTypeId: "overhead-company", share: 0.2 },
    ],
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
    overheadAllocs: [
      { overheadTypeId: "overhead-mgmt", share: 0.1 },
      { overheadTypeId: "overhead-company", share: 0.2 },
    ],
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
    overheadAllocs: [
      { overheadTypeId: "overhead-mgmt", share: 0.1 },
      { overheadTypeId: "overhead-company", share: 0.2 },
    ],
  });

  const createAgenticAiEmployee = (
    techStackId: string,
    grossMonthly: number = 10000,
    fte: number = 1.0
  ): Employee => ({
    id: `agentic-ai-${techStackId}`,
    name: "Agentic AI Employee",
    category: "AGENTIC_AI",
    techStackId,
    grossMonthly,
    netMonthly: grossMonthly * 0.7,
    oncostRate: 0.1,
    annualBenefits: 5000,
    annualBonus: 10000,
    fte,
    overheadAllocs: [
      { overheadTypeId: "overhead-mgmt", share: 0.1 },
      { overheadTypeId: "overhead-company", share: 0.2 },
    ],
  });

  describe("devReleasableHoursPerMonth 100 -> 120 reduces devCostPerRelHour", () => {
    it("should reduce devCostPerRelHour when devReleasableHoursPerMonth increases", () => {
      const techStackId = "stack-1";
      const devEmployee = createDevEmployee(techStackId, 10000, 1.0);

      const settings100: Settings = {
        ...baseSettings,
        dev_releasable_hours_per_month: 100,
      };

      const settings120: Settings = {
        ...baseSettings,
        dev_releasable_hours_per_month: 120,
      };

      const cost100 = calculateDevCostPerRelHour(
        [devEmployee],
        baseOverheadTypes,
        settings100
      );

      const cost120 = calculateDevCostPerRelHour(
        [devEmployee],
        baseOverheadTypes,
        settings120
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

      const settingsLow: Settings = {
        ...baseSettings,
        qa_ratio: 0.3,
      };

      const settingsHigh: Settings = {
        ...baseSettings,
        qa_ratio: 0.7,
      };

      // Calculate dev cost (same for both)
      const devCost = calculateDevCostPerRelHour(
        [devEmployee],
        baseOverheadTypes,
        baseSettings
      );

      // Calculate QA costs with different ratios
      const qaCostLow = calculateQaCostPerDevRelHour(
        [qaEmployee],
        baseOverheadTypes,
        settingsLow
      );

      const qaCostHigh = calculateQaCostPerDevRelHour(
        [qaEmployee],
        baseOverheadTypes,
        settingsHigh
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
    it("should increase devCostPerRelHour when overhead amounts increase", () => {
      const techStackId = "stack-1";
      const devEmployee = createDevEmployee(techStackId);

      const lowOverheadTypes: OverheadType[] = [
        {
          id: "overhead-mgmt",
          name: "Management",
          amount: 50000,
          period: "annual",
        },
        {
          id: "overhead-company",
          name: "Company",
          amount: 100000,
          period: "annual",
        },
      ];

      const highOverheadTypes: OverheadType[] = [
        {
          id: "overhead-mgmt",
          name: "Management",
          amount: 200000,
          period: "annual",
        },
        {
          id: "overhead-company",
          name: "Company",
          amount: 400000,
          period: "annual",
        },
      ];

      const costLow = calculateDevCostPerRelHour(
        [devEmployee],
        lowOverheadTypes,
        baseSettings
      );

      const costHigh = calculateDevCostPerRelHour(
        [devEmployee],
        highOverheadTypes,
        baseSettings
      );

      expect(costLow).not.toBeNull();
      expect(costHigh).not.toBeNull();
      expect(costHigh!).toBeGreaterThan(costLow!);
    });

    it("should increase QA cost when overhead amounts increase", () => {
      const qaEmployee = createQaEmployee();

      const lowOverheadTypes: OverheadType[] = [
        {
          id: "overhead-mgmt",
          name: "Management",
          amount: 50000,
          period: "annual",
        },
        {
          id: "overhead-company",
          name: "Company",
          amount: 100000,
          period: "annual",
        },
      ];

      const highOverheadTypes: OverheadType[] = [
        {
          id: "overhead-mgmt",
          name: "Management",
          amount: 200000,
          period: "annual",
        },
        {
          id: "overhead-company",
          name: "Company",
          amount: 400000,
          period: "annual",
        },
      ];

      const costLow = calculateQaCostPerDevRelHour(
        [qaEmployee],
        lowOverheadTypes,
        baseSettings
      );

      const costHigh = calculateQaCostPerDevRelHour(
        [qaEmployee],
        highOverheadTypes,
        baseSettings
      );

      expect(costHigh).toBeGreaterThan(costLow);
    });

    it("should handle monthly and quarterly overhead periods", () => {
      const techStackId = "stack-1";
      const devEmployee = createDevEmployee(techStackId);

      const monthlyOverheadTypes: OverheadType[] = [
        {
          id: "overhead-mgmt",
          name: "Management",
          amount: 10000, // monthly
          period: "monthly",
        },
        {
          id: "overhead-company",
          name: "Company",
          amount: 20000, // monthly
          period: "monthly",
        },
      ];

      // Monthly amounts should be converted to annual (multiplied by 12)
      // So 10000 monthly = 120000 annual, 20000 monthly = 240000 annual
      // This should be equivalent to the base overhead types (100000 and 200000 annual)
      const costMonthly = calculateDevCostPerRelHour(
        [devEmployee],
        monthlyOverheadTypes,
        baseSettings
      );

      const costAnnual = calculateDevCostPerRelHour(
        [devEmployee],
        baseOverheadTypes,
        baseSettings
      );

      expect(costMonthly).not.toBeNull();
      expect(costAnnual).not.toBeNull();
      // Monthly should be higher since 120000 > 100000 and 240000 > 200000
      expect(costMonthly!).toBeGreaterThan(costAnnual!);
    });
  });

  describe("edge cases", () => {
    it("should handle missing QA team (return 0 cost)", () => {
      const qaCost = calculateQaCostPerDevRelHour(
        [],
        baseOverheadTypes,
        baseSettings
      );

      expect(qaCost).toBe(0);
    });

    it("should handle missing BA team (return 0 cost)", () => {
      const baCost = calculateBaCostPerDevRelHour(
        [],
        baseOverheadTypes,
        baseSettings
      );

      expect(baCost).toBe(0);
    });

    it("should return null for devCostPerRelHour when no DEV employees", () => {
      const cost = calculateDevCostPerRelHour(
        [],
        baseOverheadTypes,
        baseSettings
      );

      expect(cost).toBeNull();
    });

    it("should throw error when devHoursCapacity is zero", () => {
      const techStackId = "stack-1";
      const devEmployee = createDevEmployee(techStackId, 10000, 0); // 0 FTE

      const settings: Settings = {
        ...baseSettings,
        dev_releasable_hours_per_month: 100,
      };

      expect(() => {
        calculateDevCostPerRelHour([devEmployee], baseOverheadTypes, settings);
      }).toThrow("hoursCapacity is zero");
    });

    it("should throw error when standardHoursPerMonth is zero for QA", () => {
      const qaEmployee = createQaEmployee();

      const settings: Settings = {
        ...baseSettings,
        standard_hours_per_month: 0,
      };

      expect(() => {
        calculateQaCostPerDevRelHour([qaEmployee], baseOverheadTypes, settings);
      }).toThrow("standard_hours_per_month is zero");
    });

    it("should handle employee with no overhead allocations", () => {
      const techStackId = "stack-1";
      const devEmployee: Employee = {
        ...createDevEmployee(techStackId),
        overheadAllocs: [],
      };

      const cost = calculateDevCostPerRelHour(
        [devEmployee],
        baseOverheadTypes,
        baseSettings
      );

      // Should still calculate, just without overhead
      expect(cost).not.toBeNull();
    });

    it("should handle missing overhead type in allocation", () => {
      const techStackId = "stack-1";
      const devEmployee: Employee = {
        ...createDevEmployee(techStackId),
        overheadAllocs: [
          { overheadTypeId: "non-existent-id", share: 0.1 },
        ],
      };

      const cost = calculateDevCostPerRelHour(
        [devEmployee],
        baseOverheadTypes,
        baseSettings
      );

      // Should still calculate, missing overhead type is ignored
      expect(cost).not.toBeNull();
    });
  });

  describe("exchange ratio currency conversion", () => {
    it("should convert EGP to USD when exchange_ratio is provided", () => {
      const techStackId = "stack-1";
      const devEmployee = createDevEmployee(techStackId, 100000, 1.0); // 100,000 EGP/month

      const settingsEGP: Settings = {
        ...baseSettings,
        exchange_ratio: 0, // No conversion, use EGP
      };

      const settingsUSD: Settings = {
        ...baseSettings,
        exchange_ratio: 50, // 1 USD = 50 EGP
      };

      const costEGP = calculateDevCostPerRelHour(
        [devEmployee],
        baseOverheadTypes,
        settingsEGP
      );

      const costUSD = calculateDevCostPerRelHour(
        [devEmployee],
        baseOverheadTypes,
        settingsUSD
      );

      expect(costEGP).not.toBeNull();
      expect(costUSD).not.toBeNull();
      // USD cost should be approximately 1/50th of EGP cost
      expect(costUSD!).toBeCloseTo(costEGP! / 50, 2);
    });

    it("should handle exchange_ratio of 0 or null (use EGP)", () => {
      const techStackId = "stack-1";
      const devEmployee = createDevEmployee(techStackId, 100000, 1.0);

      const settingsNoRatio: Settings = {
        ...baseSettings,
        // exchange_ratio not set
      };

      const settingsZeroRatio: Settings = {
        ...baseSettings,
        exchange_ratio: 0,
      };

      const costNoRatio = calculateDevCostPerRelHour(
        [devEmployee],
        baseOverheadTypes,
        settingsNoRatio
      );

      const costZeroRatio = calculateDevCostPerRelHour(
        [devEmployee],
        baseOverheadTypes,
        settingsZeroRatio
      );

      expect(costNoRatio).not.toBeNull();
      expect(costZeroRatio).not.toBeNull();
      // Both should be the same (in EGP)
      expect(costNoRatio).toBeCloseTo(costZeroRatio!, 2);
    });
  });

  describe("AGENTIC_AI pricing excludes QA/BA costs", () => {
    it("AGENTIC_AI price should not change when qaRatio changes", () => {
      const techStackId = "stack-1";
      const agenticAiEmployee = createAgenticAiEmployee(techStackId, 10000, 1.0);
      const qaEmployee = createQaEmployee(8000);

      const settingsLowQa: Settings = {
        ...baseSettings,
        qa_ratio: 0.3,
      };

      const settingsHighQa: Settings = {
        ...baseSettings,
        qa_ratio: 0.7,
      };

      const resultLowQa = calculatePricingForCategory(
        "AGENTIC_AI",
        techStackId,
        [agenticAiEmployee, qaEmployee],
        baseOverheadTypes,
        settingsLowQa
      );

      const resultHighQa = calculatePricingForCategory(
        "AGENTIC_AI",
        techStackId,
        [agenticAiEmployee, qaEmployee],
        baseOverheadTypes,
        settingsHighQa
      );

      // AGENTIC_AI final price should be the same regardless of qaRatio
      expect(resultLowQa.finalPrice).not.toBeNull();
      expect(resultHighQa.finalPrice).not.toBeNull();
      expect(resultLowQa.finalPrice).toBeCloseTo(resultHighQa.finalPrice!, 2);
      expect(resultLowQa.qaCostPerDevRelHour).toBe(0);
      expect(resultHighQa.qaCostPerDevRelHour).toBe(0);
    });

    it("AGENTIC_AI price should not change when baRatio changes", () => {
      const techStackId = "stack-1";
      const agenticAiEmployee = createAgenticAiEmployee(techStackId, 10000, 1.0);
      const baEmployee = createBaEmployee(9000);

      const settingsLowBa: Settings = {
        ...baseSettings,
        ba_ratio: 0.15,
      };

      const settingsHighBa: Settings = {
        ...baseSettings,
        ba_ratio: 0.35,
      };

      const resultLowBa = calculatePricingForCategory(
        "AGENTIC_AI",
        techStackId,
        [agenticAiEmployee, baEmployee],
        baseOverheadTypes,
        settingsLowBa
      );

      const resultHighBa = calculatePricingForCategory(
        "AGENTIC_AI",
        techStackId,
        [agenticAiEmployee, baEmployee],
        baseOverheadTypes,
        settingsHighBa
      );

      // AGENTIC_AI final price should be the same regardless of baRatio
      expect(resultLowBa.finalPrice).not.toBeNull();
      expect(resultHighBa.finalPrice).not.toBeNull();
      expect(resultLowBa.finalPrice).toBeCloseTo(resultHighBa.finalPrice!, 2);
      expect(resultLowBa.baCostPerDevRelHour).toBe(0);
      expect(resultHighBa.baCostPerDevRelHour).toBe(0);
    });

    it("DEV price should change when qaRatio changes", () => {
      const techStackId = "stack-1";
      const devEmployee = createDevEmployee(techStackId, 10000, 1.0);
      const qaEmployee = createQaEmployee(8000);

      const settingsLowQa: Settings = {
        ...baseSettings,
        qa_ratio: 0.3,
      };

      const settingsHighQa: Settings = {
        ...baseSettings,
        qa_ratio: 0.7,
      };

      const resultLowQa = calculatePricingForCategory(
        "DEV",
        techStackId,
        [devEmployee, qaEmployee],
        baseOverheadTypes,
        settingsLowQa
      );

      const resultHighQa = calculatePricingForCategory(
        "DEV",
        techStackId,
        [devEmployee, qaEmployee],
        baseOverheadTypes,
        settingsHighQa
      );

      // DEV final price should be different when qaRatio changes
      expect(resultLowQa.finalPrice).not.toBeNull();
      expect(resultHighQa.finalPrice).not.toBeNull();
      expect(resultLowQa.finalPrice).not.toBeCloseTo(resultHighQa.finalPrice!, 2);
      expect(resultLowQa.qaCostPerDevRelHour).toBeLessThan(resultHighQa.qaCostPerDevRelHour);
    });

    it("DEV price should change when baRatio changes", () => {
      const techStackId = "stack-1";
      const devEmployee = createDevEmployee(techStackId, 10000, 1.0);
      const baEmployee = createBaEmployee(9000);

      const settingsLowBa: Settings = {
        ...baseSettings,
        ba_ratio: 0.15,
      };

      const settingsHighBa: Settings = {
        ...baseSettings,
        ba_ratio: 0.35,
      };

      const resultLowBa = calculatePricingForCategory(
        "DEV",
        techStackId,
        [devEmployee, baEmployee],
        baseOverheadTypes,
        settingsLowBa
      );

      const resultHighBa = calculatePricingForCategory(
        "DEV",
        techStackId,
        [devEmployee, baEmployee],
        baseOverheadTypes,
        settingsHighBa
      );

      // DEV final price should be different when baRatio changes
      expect(resultLowBa.finalPrice).not.toBeNull();
      expect(resultHighBa.finalPrice).not.toBeNull();
      expect(resultLowBa.finalPrice).not.toBeCloseTo(resultHighBa.finalPrice!, 2);
      expect(resultLowBa.baCostPerDevRelHour).toBeLessThan(resultHighBa.baCostPerDevRelHour);
    });
  });

  describe("annual_increase setting", () => {
    it("should increase annualBase by 10% on gross part when annual_increase=0.10", () => {
      const employee = createDevEmployee("stack-1", 10000, 1.0);
      const settingsWithIncrease: Settings = {
        ...baseSettings,
        annual_increase: 0.10,
      };
      const settingsWithoutIncrease: Settings = {
        ...baseSettings,
        annual_increase: 0,
      };

      // Calculate annual base with and without increase
      const annualBaseWithIncrease = calculateAnnualBase(employee, null, 0.10);
      const annualBaseWithoutIncrease = calculateAnnualBase(employee, null, 0);

      // Expected: grossMonthly * 12 * (1 + 0.1) = 10000 * 12 * 1.1 = 132000
      // Without: grossMonthly * 12 = 10000 * 12 = 120000
      // Oncost: 0.1 * grossAnnual, so it also increases
      // Benefits and bonus don't change
      const expectedGrossAnnualWithIncrease = 10000 * 12 * 1.1; // 132000
      const expectedGrossAnnualWithoutIncrease = 10000 * 12; // 120000
      const expectedOncostWithIncrease = expectedGrossAnnualWithIncrease * 0.1; // 13200
      const expectedOncostWithoutIncrease = expectedGrossAnnualWithoutIncrease * 0.1; // 12000
      const benefits = 5000;
      const bonus = 10000;

      const expectedAnnualBaseWithIncrease =
        expectedGrossAnnualWithIncrease + expectedOncostWithIncrease + benefits + bonus;
      const expectedAnnualBaseWithoutIncrease =
        expectedGrossAnnualWithoutIncrease + expectedOncostWithoutIncrease + benefits + bonus;

      expect(annualBaseWithIncrease).toBeCloseTo(expectedAnnualBaseWithIncrease, 2);
      expect(annualBaseWithoutIncrease).toBeCloseTo(expectedAnnualBaseWithoutIncrease, 2);
      expect(annualBaseWithIncrease).toBeGreaterThan(annualBaseWithoutIncrease);
    });

    it("should have no effect when annual_increase=0", () => {
      const employee = createDevEmployee("stack-1", 10000, 1.0);
      const settingsWithZero: Settings = {
        ...baseSettings,
        annual_increase: 0,
      };

      const annualBaseWithZero = calculateAnnualBase(employee, null, 0);
      const annualBaseDefault = calculateAnnualBase(employee, null); // default is 0

      // Should be the same
      expect(annualBaseWithZero).toBeCloseTo(annualBaseDefault, 2);
    });

    it("should affect pricing calculations when annual_increase is set", () => {
      const devEmployee = createDevEmployee("stack-1", 10000, 1.0);
      const settingsWithIncrease: Settings = {
        ...baseSettings,
        annual_increase: 0.10,
      };
      const settingsWithoutIncrease: Settings = {
        ...baseSettings,
        annual_increase: 0,
      };

      const resultWithIncrease = calculatePricingForCategory(
        "DEV",
        "stack-1",
        [devEmployee],
        baseOverheadTypes,
        settingsWithIncrease
      );
      const resultWithoutIncrease = calculatePricingForCategory(
        "DEV",
        "stack-1",
        [devEmployee],
        baseOverheadTypes,
        settingsWithoutIncrease
      );

      // With 10% increase, the dev cost per hour should be higher
      expect(resultWithIncrease.devCostPerRelHour).not.toBeNull();
      expect(resultWithoutIncrease.devCostPerRelHour).not.toBeNull();
      expect(resultWithIncrease.devCostPerRelHour!).toBeGreaterThan(
        resultWithoutIncrease.devCostPerRelHour!
      );
    });
  });
});
