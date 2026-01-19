"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getAdjustedGrossMonthly } from "@/lib/pricing";

function parseDecimal(value: string | null): Prisma.Decimal | null {
  if (!value || value.trim() === "") return null;
  return new Prisma.Decimal(value);
}

function parseFloatValue(value: string | null): number | null {
  if (!value || value.trim() === "") return null;
  const parsed = Number.parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

function parseBoolean(value: string | null): boolean {
  return value === "true" || value === "on";
}

// OverheadType CRUD
export async function createOverheadType(formData: FormData) {
  const name = formData.get("name") as string;
  const amount = formData.get("amount") as string;
  const period = formData.get("period") as string;
  const isActive = formData.get("isActive") as string | null;

  if (!name || !amount || !period) {
    return { error: "Name, amount, and period are required" };
  }

  const validPeriods = ["annual", "monthly", "quarterly"];
  if (!validPeriods.includes(period)) {
    return { error: "Invalid period" };
  }

  const amountValue = parseDecimal(amount);
  if (!amountValue || amountValue.lte(0)) {
    return { error: "Amount must be greater than zero" };
  }

  try {
    await db.overheadType.create({
      data: {
        name: name.trim(),
        amount: amountValue,
        period: period as any,
        isActive: isActive !== null ? parseBoolean(isActive) : true, // Default to true
      },
    });

    revalidatePath("/overheads");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to create overhead type" };
  }
}

export async function updateOverheadType(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const amount = formData.get("amount") as string;
  const period = formData.get("period") as string;
  const isActive = formData.get("isActive") as string | null;

  if (!id || !name || !amount || !period) {
    return { error: "ID, name, amount, and period are required" };
  }

  const validPeriods = ["annual", "monthly", "quarterly"];
  if (!validPeriods.includes(period)) {
    return { error: "Invalid period" };
  }

  const amountValue = parseDecimal(amount);
  if (!amountValue || amountValue.lte(0)) {
    return { error: "Amount must be greater than zero" };
  }

  try {
    await db.overheadType.update({
      where: { id },
      data: {
        name: name.trim(),
        amount: amountValue,
        period: period as any,
        isActive: isActive !== null ? parseBoolean(isActive) : true,
      },
    });

    revalidatePath("/overheads");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2025") {
      return { error: "Overhead type not found" };
    }
    return { error: "Failed to update overhead type" };
  }
}

export async function toggleOverheadTypeActive(formData: FormData) {
  const id = formData.get("id") as string;
  const isActive = formData.get("isActive") as string;

  if (!id) {
    return { error: "ID is required" };
  }

  try {
    await db.overheadType.update({
      where: { id },
      data: {
        isActive: parseBoolean(isActive),
      },
    });
    revalidatePath("/overheads");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2025") {
      return { error: "Overhead type not found" };
    }
    return { error: "Failed to update overhead type status" };
  }
}

export async function deleteOverheadType(overheadTypeId: string) {
  try {
    await db.overheadType.delete({
      where: { id: overheadTypeId },
    });

    revalidatePath("/overheads");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2025") {
      return { error: "Overhead type not found" };
    }
    if (error.code === "P2003") {
      return { error: "Cannot delete: overhead type has allocations" };
    }
    return { error: "Failed to delete overhead type" };
  }
}

// OverheadAllocation CRUD
export async function updateOverheadAllocation(formData: FormData) {
  const employeeId = formData.get("employeeId") as string;
  const overheadTypeId = formData.get("overheadTypeId") as string;
  const share = formData.get("share") as string;

  if (!employeeId || !overheadTypeId) {
    return { error: "Employee ID and overhead type ID are required" };
  }

  const shareValue = parseFloatValue(share);
  if (shareValue === null) {
    return { error: "Share is required" };
  }

  if (shareValue < 0) {
    return { error: "Share cannot be negative" };
  }

  try {
    await db.overheadAllocation.upsert({
      where: {
        employeeId_overheadTypeId: {
          employeeId,
          overheadTypeId,
        },
      },
      create: {
        employeeId,
        overheadTypeId,
        share: shareValue,
      },
      update: {
        share: shareValue,
      },
    });

    revalidatePath("/overheads");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2003") {
      return { error: "Employee or overhead type not found" };
    }
    return { error: "Failed to update overhead allocation" };
  }
}

// Allocation helpers per overhead type
export async function allocateEqually(overheadTypeId: string) {
  try {
    // Only allocate to active employees
    const employees = await db.employee.findMany({
      where: { isActive: true },
    });
    const count = employees.length;

    if (count === 0) {
      return { error: "No active employees found" };
    }

    const share = 1 / count;

    await db.$transaction(
      employees.map((emp) =>
        db.overheadAllocation.upsert({
          where: {
            employeeId_overheadTypeId: {
              employeeId: emp.id,
              overheadTypeId,
            },
          },
          create: {
            employeeId: emp.id,
            overheadTypeId,
            share,
          },
          update: {
            share,
          },
        })
      )
    );

    revalidatePath("/overheads");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to allocate equally" };
  }
}

export async function allocateProportionalToGross(overheadTypeId: string) {
  try {
    // Get annual_increase setting
    const annualIncreaseSetting = await db.setting.findUnique({
      where: { key: "annual_increase" },
    });
    const annualIncrease =
      annualIncreaseSetting?.valueType === "float" || annualIncreaseSetting?.valueType === "number"
        ? Number.parseFloat(annualIncreaseSetting.value)
        : annualIncreaseSetting?.valueType === "integer"
        ? Number.parseInt(annualIncreaseSetting.value, 10)
        : 0;
    const annualIncreaseValue = Number.isFinite(annualIncrease) ? annualIncrease : 0;

    // Only allocate to active employees
    const employees = await db.employee.findMany({
      where: { isActive: true },
    });

    if (employees.length === 0) {
      return { error: "No active employees found" };
    }

    // Calculate total adjusted gross monthly
    const totalAdjustedGross = employees.reduce((sum, emp) => {
      const employeeForCalc = {
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
      };
      const adjustedGross = getAdjustedGrossMonthly(employeeForCalc, annualIncreaseValue);
      return sum + adjustedGross;
    }, 0);

    if (totalAdjustedGross === 0) {
      return { error: "Total adjusted gross monthly is zero" };
    }

    await db.$transaction(
      employees.map((emp) => {
        const employeeForCalc = {
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
        };
        const adjustedGross = getAdjustedGrossMonthly(employeeForCalc, annualIncreaseValue);
        const share = adjustedGross / totalAdjustedGross;
        return db.overheadAllocation.upsert({
          where: {
            employeeId_overheadTypeId: {
              employeeId: emp.id,
              overheadTypeId,
            },
          },
          create: {
            employeeId: emp.id,
            overheadTypeId,
            share,
          },
          update: {
            share,
          },
        });
      })
    );

    revalidatePath("/overheads");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to allocate proportional to gross" };
  }
}

export async function normalizeTo100Percent(overheadTypeId: string) {
  try {
    // Only normalize allocations for active employees and active overhead type
    const allocations = await db.overheadAllocation.findMany({
      where: {
        overheadTypeId,
        employee: { isActive: true },
        overheadType: { isActive: true },
      },
    });

    if (allocations.length === 0) {
      return { error: "No active allocations found for this overhead type" };
    }

    // Calculate total
    const total = allocations.reduce((sum, alloc) => sum + alloc.share, 0);

    if (total === 0) {
      return { error: "All shares are zero" };
    }

    // Normalize each allocation
    await db.$transaction(
      allocations.map((alloc) => {
        const normalizedShare = alloc.share / total;
        return db.overheadAllocation.update({
          where: { id: alloc.id },
          data: {
            share: normalizedShare,
          },
        });
      })
    );

    revalidatePath("/overheads");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to normalize allocations" };
  }
}

// Employee toggle active (for use in overheads page)
export async function toggleEmployeeActive(formData: FormData) {
  const id = formData.get("id") as string;
  const isActive = formData.get("isActive") as string;

  if (!id) {
    return { error: "ID is required" };
  }

  try {
    await db.employee.update({
      where: { id },
      data: {
        isActive: parseBoolean(isActive),
      },
    });
    revalidatePath("/overheads");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2025") {
      return { error: "Employee not found" };
    }
    return { error: "Failed to update employee status" };
  }
}
