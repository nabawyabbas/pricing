import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./db";
import { getEffectiveOverheadAllocs } from "./effective-allocations";
import { type Employee, type OverheadType } from "./pricing";

describe("Effective Allocations", () => {
  beforeEach(async () => {
    // Clean up test data if needed
  });

  it("should return base allocations when viewId is null", async () => {
    const employees: Employee[] = [
      {
        id: "emp1",
        name: "Employee 1",
        category: "DEV",
        techStackId: "stack1",
        grossMonthly: 10000,
        netMonthly: 7000,
        oncostRate: 0.2,
        annualBenefits: null,
        annualBonus: null,
        fte: 1.0,
        overheadAllocs: [
          { overheadTypeId: "overhead1", share: 0.5 },
        ],
      },
    ];
    const overheadTypes: OverheadType[] = [
      { id: "overhead1", name: "Overhead 1", amount: 100000, period: "annual" },
    ];
    const effectiveEmployeeActive = new Map([["emp1", true]]);
    const effectiveOverheadTypeActive = new Map([["overhead1", true]]);

    const result = await getEffectiveOverheadAllocs(
      null,
      employees,
      overheadTypes,
      effectiveEmployeeActive,
      effectiveOverheadTypeActive
    );

    expect(result.get("emp1")).toBeDefined();
    expect(result.get("emp1")?.length).toBe(1);
    expect(result.get("emp1")?.[0].share).toBe(0.5);
  });

  it("should merge override share into base allocation", async () => {
    // Create a test view
    const view = await db.pricingView.create({
      data: { name: "Test View" },
    });

    // Create test employee and overhead type
    const techStack = await db.techStack.create({
      data: { name: "Test Stack" },
    });

    const employee = await db.employee.create({
      data: {
        name: "Test Employee",
        category: "DEV",
        techStackId: techStack.id,
        grossMonthly: 10000,
        netMonthly: 7000,
        fte: 1.0,
      },
    });

    const overheadType = await db.overheadType.create({
      data: {
        name: "Test Overhead",
        amount: 100000,
        period: "annual",
      },
    });

    // Create base allocation
    await db.overheadAllocation.create({
      data: {
        employeeId: employee.id,
        overheadTypeId: overheadType.id,
        share: 0.5,
      },
    });

    // Create override
    await db.overheadAllocationOverride.create({
      data: {
        viewId: view.id,
        employeeId: employee.id,
        overheadTypeId: overheadType.id,
        share: 0.7,
      },
    });

    const employees: Employee[] = [
      {
        id: employee.id,
        name: employee.name,
        category: employee.category as "DEV",
        techStackId: employee.techStackId,
        grossMonthly: Number(employee.grossMonthly),
        netMonthly: Number(employee.netMonthly),
        oncostRate: employee.oncostRate,
        annualBenefits: employee.annualBenefits ? Number(employee.annualBenefits) : null,
        annualBonus: employee.annualBonus ? Number(employee.annualBonus) : null,
        fte: employee.fte,
        overheadAllocs: [{ overheadTypeId: overheadType.id, share: 0.5 }],
      },
    ];
    const overheadTypes: OverheadType[] = [
      {
        id: overheadType.id,
        name: overheadType.name,
        amount: Number(overheadType.amount),
        period: overheadType.period as "annual",
      },
    ];
    const effectiveEmployeeActive = new Map([[employee.id, true]]);
    const effectiveOverheadTypeActive = new Map([[overheadType.id, true]]);

    const result = await getEffectiveOverheadAllocs(
      view.id,
      employees,
      overheadTypes,
      effectiveEmployeeActive,
      effectiveOverheadTypeActive
    );

    expect(result.get(employee.id)).toBeDefined();
    expect(result.get(employee.id)?.[0].share).toBe(0.7); // Override value, not base

    // Cleanup
    await db.overheadAllocationOverride.deleteMany({ where: { viewId: view.id } });
    await db.overheadAllocation.deleteMany({ where: { employeeId: employee.id } });
    await db.employee.delete({ where: { id: employee.id } });
    await db.overheadType.delete({ where: { id: overheadType.id } });
    await db.techStack.delete({ where: { id: techStack.id } });
    await db.pricingView.delete({ where: { id: view.id } });
  });

  it("should revert to base when override is deleted", async () => {
    const view = await db.pricingView.create({
      data: { name: "Test View" },
    });

    const techStack = await db.techStack.create({
      data: { name: "Test Stack" },
    });

    const employee = await db.employee.create({
      data: {
        name: "Test Employee",
        category: "DEV",
        techStackId: techStack.id,
        grossMonthly: 10000,
        netMonthly: 7000,
        fte: 1.0,
      },
    });

    const overheadType = await db.overheadType.create({
      data: {
        name: "Test Overhead",
        amount: 100000,
        period: "annual",
      },
    });

    await db.overheadAllocation.create({
      data: {
        employeeId: employee.id,
        overheadTypeId: overheadType.id,
        share: 0.5,
      },
    });

    await db.overheadAllocationOverride.create({
      data: {
        viewId: view.id,
        employeeId: employee.id,
        overheadTypeId: overheadType.id,
        share: 0.7,
      },
    });

    const employees: Employee[] = [
      {
        id: employee.id,
        name: employee.name,
        category: employee.category as "DEV",
        techStackId: employee.techStackId,
        grossMonthly: Number(employee.grossMonthly),
        netMonthly: Number(employee.netMonthly),
        oncostRate: employee.oncostRate,
        annualBenefits: null,
        annualBonus: null,
        fte: employee.fte,
        overheadAllocs: [{ overheadTypeId: overheadType.id, share: 0.5 }],
      },
    ];
    const overheadTypes: OverheadType[] = [
      {
        id: overheadType.id,
        name: overheadType.name,
        amount: Number(overheadType.amount),
        period: overheadType.period as "annual",
      },
    ];
    const effectiveEmployeeActive = new Map([[employee.id, true]]);
    const effectiveOverheadTypeActive = new Map([[overheadType.id, true]]);

    let result = await getEffectiveOverheadAllocs(
      view.id,
      employees,
      overheadTypes,
      effectiveEmployeeActive,
      effectiveOverheadTypeActive
    );
    expect(result.get(employee.id)?.[0].share).toBe(0.7);

    await db.overheadAllocationOverride.deleteMany({ where: { viewId: view.id } });

    result = await getEffectiveOverheadAllocs(
      view.id,
      employees,
      overheadTypes,
      effectiveEmployeeActive,
      effectiveOverheadTypeActive
    );
    expect(result.get(employee.id)?.[0].share).toBe(0.5); // Back to base

    // Cleanup
    await db.overheadAllocation.deleteMany({ where: { employeeId: employee.id } });
    await db.employee.delete({ where: { id: employee.id } });
    await db.overheadType.delete({ where: { id: overheadType.id } });
    await db.techStack.delete({ where: { id: techStack.id } });
    await db.pricingView.delete({ where: { id: view.id } });
  });

  it("should include override-only rows when base allocation missing", async () => {
    const view = await db.pricingView.create({
      data: { name: "Test View" },
    });

    const techStack = await db.techStack.create({
      data: { name: "Test Stack" },
    });

    const employee = await db.employee.create({
      data: {
        name: "Test Employee",
        category: "DEV",
        techStackId: techStack.id,
        grossMonthly: 10000,
        netMonthly: 7000,
        fte: 1.0,
      },
    });

    const overheadType = await db.overheadType.create({
      data: {
        name: "Test Overhead",
        amount: 100000,
        period: "annual",
      },
    });

    // Create override without base allocation
    await db.overheadAllocationOverride.create({
      data: {
        viewId: view.id,
        employeeId: employee.id,
        overheadTypeId: overheadType.id,
        share: 0.3,
      },
    });

    const employees: Employee[] = [
      {
        id: employee.id,
        name: employee.name,
        category: employee.category as "DEV",
        techStackId: employee.techStackId,
        grossMonthly: Number(employee.grossMonthly),
        netMonthly: Number(employee.netMonthly),
        oncostRate: employee.oncostRate,
        annualBenefits: null,
        annualBonus: null,
        fte: employee.fte,
        overheadAllocs: [], // No base allocation
      },
    ];
    const overheadTypes: OverheadType[] = [
      {
        id: overheadType.id,
        name: overheadType.name,
        amount: Number(overheadType.amount),
        period: overheadType.period as "annual",
      },
    ];
    const effectiveEmployeeActive = new Map([[employee.id, true]]);
    const effectiveOverheadTypeActive = new Map([[overheadType.id, true]]);

    const result = await getEffectiveOverheadAllocs(
      view.id,
      employees,
      overheadTypes,
      effectiveEmployeeActive,
      effectiveOverheadTypeActive
    );

    expect(result.get(employee.id)).toBeDefined();
    expect(result.get(employee.id)?.[0].share).toBe(0.3); // Override-only row included

    // Cleanup
    await db.overheadAllocationOverride.deleteMany({ where: { viewId: view.id } });
    await db.employee.delete({ where: { id: employee.id } });
    await db.overheadType.delete({ where: { id: overheadType.id } });
    await db.techStack.delete({ where: { id: techStack.id } });
    await db.pricingView.delete({ where: { id: view.id } });
  });

  it("should filter out share=0 allocations", async () => {
    const employees: Employee[] = [
      {
        id: "emp1",
        name: "Employee 1",
        category: "DEV",
        techStackId: "stack1",
        grossMonthly: 10000,
        netMonthly: 7000,
        oncostRate: 0.2,
        annualBenefits: null,
        annualBonus: null,
        fte: 1.0,
        overheadAllocs: [
          { overheadTypeId: "overhead1", share: 0.5 },
          { overheadTypeId: "overhead2", share: 0 }, // Should be filtered out
        ],
      },
    ];
    const overheadTypes: OverheadType[] = [
      { id: "overhead1", name: "Overhead 1", amount: 100000, period: "annual" },
      { id: "overhead2", name: "Overhead 2", amount: 200000, period: "annual" },
    ];
    const effectiveEmployeeActive = new Map([["emp1", true]]);
    const effectiveOverheadTypeActive = new Map([["overhead1", true], ["overhead2", true]]);

    const result = await getEffectiveOverheadAllocs(
      null,
      employees,
      overheadTypes,
      effectiveEmployeeActive,
      effectiveOverheadTypeActive
    );

    expect(result.get("emp1")).toBeDefined();
    expect(result.get("emp1")?.length).toBe(1); // Only one allocation (share > 0)
    expect(result.get("emp1")?.[0].overheadTypeId).toBe("overhead1");
  });
});

