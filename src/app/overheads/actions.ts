"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

function parseDecimal(value: string | null): Prisma.Decimal | null {
  if (!value || value.trim() === "") return null;
  return new Prisma.Decimal(value);
}

function parseFloatValue(value: string | null): number | null {
  if (!value || value.trim() === "") return null;
  const parsed = Number.parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

export async function updateOverheadPool(formData: FormData) {
  const managementOverheadAnnual = formData.get("managementOverheadAnnual") as string;
  const companyOverheadAnnual = formData.get("companyOverheadAnnual") as string;

  if (!managementOverheadAnnual || !companyOverheadAnnual) {
    return { error: "Both overhead amounts are required" };
  }

  try {
    // Get or create the single OverheadPool
    const existing = await db.overheadPool.findFirst();
    
    if (existing) {
      await db.overheadPool.update({
        where: { id: existing.id },
        data: {
          managementOverheadAnnual: new Prisma.Decimal(managementOverheadAnnual),
          companyOverheadAnnual: new Prisma.Decimal(companyOverheadAnnual),
        },
      });
    } else {
      await db.overheadPool.create({
        data: {
          managementOverheadAnnual: new Prisma.Decimal(managementOverheadAnnual),
          companyOverheadAnnual: new Prisma.Decimal(companyOverheadAnnual),
        },
      });
    }
    
    revalidatePath("/overheads");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to update overhead pool" };
  }
}

export async function updateOverheadAllocation(formData: FormData) {
  const employeeId = formData.get("employeeId") as string;
  const mgmtShare = formData.get("mgmtShare") as string;
  const companyShare = formData.get("companyShare") as string;

  if (!employeeId) {
    return { error: "Employee ID is required" };
  }

  const mgmtShareValue = parseFloatValue(mgmtShare);
  const companyShareValue = parseFloatValue(companyShare);

  if (mgmtShareValue === null || companyShareValue === null) {
    return { error: "Both shares are required" };
  }

  if (mgmtShareValue < 0 || companyShareValue < 0) {
    return { error: "Shares cannot be negative" };
  }

  try {
    const existing = await db.overheadAllocation.findUnique({
      where: { employeeId },
    });

    if (existing) {
      await db.overheadAllocation.update({
        where: { employeeId },
        data: {
          mgmtShare: mgmtShareValue,
          companyShare: companyShareValue,
        },
      });
    } else {
      await db.overheadAllocation.create({
        data: {
          employeeId,
          mgmtShare: mgmtShareValue,
          companyShare: companyShareValue,
        },
      });
    }

    revalidatePath("/overheads");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2003") {
      return { error: "Employee not found" };
    }
    return { error: "Failed to update overhead allocation" };
  }
}

export async function allocateEqually() {
  try {
    const employees = await db.employee.findMany();
    const count = employees.length;

    if (count === 0) {
      return { error: "No employees found" };
    }

    const share = 1 / count;

    await db.$transaction(
      employees.map((emp) =>
        db.overheadAllocation.upsert({
          where: { employeeId: emp.id },
          create: {
            employeeId: emp.id,
            mgmtShare: share,
            companyShare: share,
          },
          update: {
            mgmtShare: share,
            companyShare: share,
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

export async function allocateProportionalToGross() {
  try {
    const employees = await db.employee.findMany({
      include: {
        overheadAlloc: true,
      },
    });

    if (employees.length === 0) {
      return { error: "No employees found" };
    }

    // Calculate total gross monthly
    const totalGross = employees.reduce((sum, emp) => {
      return sum + Number(emp.grossMonthly);
    }, 0);

    if (totalGross === 0) {
      return { error: "Total gross monthly is zero" };
    }

    await db.$transaction(
      employees.map((emp) => {
        const share = Number(emp.grossMonthly) / totalGross;
        return db.overheadAllocation.upsert({
          where: { employeeId: emp.id },
          create: {
            employeeId: emp.id,
            mgmtShare: share,
            companyShare: share,
          },
          update: {
            mgmtShare: share,
            companyShare: share,
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

export async function normalizeTo100Percent() {
  try {
    const allocations = await db.overheadAllocation.findMany();

    if (allocations.length === 0) {
      return { error: "No allocations found" };
    }

    // Calculate totals
    const totalMgmt = allocations.reduce((sum, alloc) => sum + alloc.mgmtShare, 0);
    const totalCompany = allocations.reduce((sum, alloc) => sum + alloc.companyShare, 0);

    if (totalMgmt === 0 && totalCompany === 0) {
      return { error: "All shares are zero" };
    }

    // Normalize each allocation
    await db.$transaction(
      allocations.map((alloc) => {
        const normalizedMgmt = totalMgmt > 0 ? alloc.mgmtShare / totalMgmt : 0;
        const normalizedCompany = totalCompany > 0 ? alloc.companyShare / totalCompany : 0;

        return db.overheadAllocation.update({
          where: { id: alloc.id },
          data: {
            mgmtShare: normalizedMgmt,
            companyShare: normalizedCompany,
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

