"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getEmployeeOverrides, getOverheadTypeOverrides } from "@/lib/views";

/**
 * Create a new pricing view
 */
export async function createView(name: string) {
  try {
    const view = await db.pricingView.create({
      data: {
        name: name.trim(),
      },
    });
    revalidatePath("/views");
    return { success: true, view };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return { success: false, error: "A view with this name already exists" };
      }
    }
    return { success: false, error: "Failed to create view" };
  }
}

/**
 * Rename a pricing view
 */
export async function renameView(id: string, name: string) {
  try {
    await db.pricingView.update({
      where: { id },
      data: { name: name.trim() },
    });
    revalidatePath("/views");
    revalidatePath(`/views/${id}`);
    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return { success: false, error: "View not found" };
      }
    }
    return { success: false, error: "Failed to rename view" };
  }
}

/**
 * Delete a pricing view (cascades to overrides)
 */
export async function deleteView(id: string) {
  try {
    await db.pricingView.delete({
      where: { id },
    });
    revalidatePath("/views");
    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return { success: false, error: "View not found" };
      }
    }
    return { success: false, error: "Failed to delete view" };
  }
}

/**
 * Set employee active override
 * If nextEffectiveIsActive === base.isActive, delete override (revert)
 * Else upsert override
 */
export async function setEmployeeOverride(
  viewId: string,
  employeeId: string,
  nextEffectiveIsActive: boolean
) {
  try {
    // Get base employee status
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: { isActive: true },
    });

    if (!employee) {
      return { success: false, error: "Employee not found" };
    }

    // If override matches base, delete override (revert)
    if (nextEffectiveIsActive === employee.isActive) {
      await db.employeeActiveOverride.deleteMany({
        where: {
          viewId,
          employeeId,
        },
      });
    } else {
      // Upsert override
      await db.employeeActiveOverride.upsert({
        where: {
          viewId_employeeId: {
            viewId,
            employeeId,
          },
        },
        create: {
          viewId,
          employeeId,
          isActive: nextEffectiveIsActive,
        },
        update: {
          isActive: nextEffectiveIsActive,
        },
      });
    }

    revalidatePath(`/views/${viewId}`);
    revalidatePath("/");
    revalidatePath("/results");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to set employee override" };
  }
}

/**
 * Set overhead type active override
 * If nextEffectiveIsActive === base.isActive, delete override (revert)
 * Else upsert override
 */
export async function setOverheadTypeOverride(
  viewId: string,
  overheadTypeId: string,
  nextEffectiveIsActive: boolean
) {
  try {
    // Get base overhead type status
    const overheadType = await db.overheadType.findUnique({
      where: { id: overheadTypeId },
      select: { isActive: true },
    });

    if (!overheadType) {
      return { success: false, error: "Overhead type not found" };
    }

    // If override matches base, delete override (revert)
    if (nextEffectiveIsActive === overheadType.isActive) {
      await db.overheadTypeActiveOverride.deleteMany({
        where: {
          viewId,
          overheadTypeId,
        },
      });
    } else {
      // Upsert override
      await db.overheadTypeActiveOverride.upsert({
        where: {
          viewId_overheadTypeId: {
            viewId,
            overheadTypeId,
          },
        },
        create: {
          viewId,
          overheadTypeId,
          isActive: nextEffectiveIsActive,
        },
        update: {
          isActive: nextEffectiveIsActive,
        },
      });
    }

    revalidatePath(`/views/${viewId}`);
    revalidatePath("/");
    revalidatePath("/results");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to set overhead type override" };
  }
}

/**
 * Set setting override
 * If value is null => delete override row (revert to global)
 * If parsedValue equals global setting => delete override (keep sparse)
 * Else upsert override
 */
export async function setSettingOverride(
  viewId: string,
  key: string,
  value: string | null,
  valueType: "string" | "number" | "float" | "integer" | "boolean",
  group?: string | null,
  unit?: string | null
) {
  try {
    // If value is null, delete override (revert)
    if (value === null) {
      await db.settingOverride.deleteMany({
        where: {
          viewId,
          key,
        },
      });
      revalidatePath(`/views/${viewId}`);
      revalidatePath("/");
      revalidatePath("/results");
      return { success: true };
    }

    // Get global setting to check if override matches
    const globalSetting = await db.setting.findUnique({
      where: { key },
    });

    // If global setting exists and parsed values match, delete override (keep sparse)
    if (globalSetting) {
      let parsedGlobal: number | string | boolean;
      let parsedOverride: number | string | boolean;

      if (valueType === "float" || valueType === "number") {
        parsedGlobal = Number.parseFloat(globalSetting.value);
        parsedOverride = Number.parseFloat(value);
      } else if (valueType === "integer") {
        parsedGlobal = Number.parseInt(globalSetting.value, 10);
        parsedOverride = Number.parseInt(value, 10);
      } else if (valueType === "boolean") {
        parsedGlobal = globalSetting.value === "true";
        parsedOverride = value === "true";
      } else {
        parsedGlobal = globalSetting.value;
        parsedOverride = value;
      }

      if (parsedGlobal === parsedOverride) {
        await db.settingOverride.deleteMany({
          where: {
            viewId,
            key,
          },
        });
        revalidatePath(`/views/${viewId}`);
        revalidatePath("/");
        revalidatePath("/results");
        return { success: true };
      }
    }

    // Upsert override
    await db.settingOverride.upsert({
      where: {
        viewId_key: {
          viewId,
          key,
        },
      },
      create: {
        viewId,
        key,
        value,
        valueType: valueType as any,
        group: group || null,
        unit: unit || null,
      },
      update: {
        value,
        valueType: valueType as any,
        group: group || null,
        unit: unit || null,
      },
    });

    revalidatePath(`/views/${viewId}`);
    revalidatePath("/");
    revalidatePath("/results");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to set setting override" };
  }
}

/**
 * Set allocation override
 * If share is null => delete override (revert to base)
 * If base row exists AND share === base.share => delete override (keep sparse)
 * Else upsert override
 */
export async function setAllocationOverride(
  viewId: string,
  employeeId: string,
  overheadTypeId: string,
  share: number | null
) {
  try {
    // Validate share if provided
    if (share !== null) {
      if (share < 0 || share > 1) {
        return { success: false, error: "Share must be between 0 and 1" };
      }
    }

    // Get base allocation if it exists
    const baseAllocation = await db.overheadAllocation.findUnique({
      where: {
        employeeId_overheadTypeId: {
          employeeId,
          overheadTypeId,
        },
      },
      select: { share: true },
    });

    // If share is null, delete override (revert)
    if (share === null) {
      await db.overheadAllocationOverride.deleteMany({
        where: {
          viewId,
          employeeId,
          overheadTypeId,
        },
      });
      revalidatePath(`/views/${viewId}`);
      revalidatePath("/");
      revalidatePath("/results");
      revalidatePath("/overheads");
      return { success: true };
    }

    // If base allocation exists and share matches base, delete override (keep sparse)
    if (baseAllocation && share === baseAllocation.share) {
      await db.overheadAllocationOverride.deleteMany({
        where: {
          viewId,
          employeeId,
          overheadTypeId,
        },
      });
      revalidatePath(`/views/${viewId}`);
      revalidatePath("/");
      revalidatePath("/results");
      revalidatePath("/overheads");
      return { success: true };
    }

    // Upsert override
    await db.overheadAllocationOverride.upsert({
      where: {
        viewId_employeeId_overheadTypeId: {
          viewId,
          employeeId,
          overheadTypeId,
        },
      },
      create: {
        viewId,
        employeeId,
        overheadTypeId,
        share,
      },
      update: {
        share,
      },
    });

    revalidatePath(`/views/${viewId}`);
    revalidatePath("/");
    revalidatePath("/results");
    revalidatePath("/overheads");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to set allocation override" };
  }
}

/**
 * Allocate equally for a view (creates/updates allocation overrides)
 * Only works on effective active employees and effective active overhead types
 */
export async function allocateEquallyForView(viewId: string, overheadTypeId: string) {
  try {
    // Get effective employee active status
    const employeeOverrides = await getEmployeeOverrides(viewId);
    const allEmployees = await db.employee.findMany();
    const effectiveActiveEmployees = allEmployees.filter((emp) => {
      const override = employeeOverrides.get(emp.id);
      const effectiveIsActive = override ? override.isActive : emp.isActive;
      return effectiveIsActive;
    });

    // Get effective overhead type active status
    const overheadTypeOverrides = await getOverheadTypeOverrides(viewId);
    const overheadType = await db.overheadType.findUnique({
      where: { id: overheadTypeId },
    });
    if (!overheadType) {
      return { success: false, error: "Overhead type not found" };
    }
    const overheadTypeOverride = overheadTypeOverrides.get(overheadTypeId);
    const effectiveOverheadTypeActive = overheadTypeOverride
      ? overheadTypeOverride.isActive
      : overheadType.isActive;
    if (!effectiveOverheadTypeActive) {
      return { success: false, error: "Overhead type is not active in this view" };
    }

    if (effectiveActiveEmployees.length === 0) {
      return { success: false, error: "No active employees found in this view" };
    }

    const share = 1 / effectiveActiveEmployees.length;

    await db.$transaction(
      effectiveActiveEmployees.map((emp) => {
        return db.overheadAllocationOverride.upsert({
          where: {
            viewId_employeeId_overheadTypeId: {
              viewId,
              employeeId: emp.id,
              overheadTypeId,
            },
          },
          create: {
            viewId,
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

    revalidatePath(`/views/${viewId}`);
    revalidatePath("/");
    revalidatePath("/results");
    revalidatePath("/overheads");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to allocate equally" };
  }
}

/**
 * Allocate proportional to gross for a view (creates/updates allocation overrides)
 * Only works on effective active employees and effective active overhead types
 */
export async function allocateProportionalToGrossForView(viewId: string, overheadTypeId: string) {
  try {
    // Get effective settings for annual_increase
    const { getEffectiveSettings } = await import("@/lib/effective-settings");
    const effectiveSettings = await getEffectiveSettings(viewId);
    const annualIncrease = effectiveSettings.annual_increase ?? 0;

    // Get effective employee active status
    const employeeOverrides = await getEmployeeOverrides(viewId);
    const allEmployees = await db.employee.findMany();
    const effectiveActiveEmployees = allEmployees.filter((emp) => {
      const override = employeeOverrides.get(emp.id);
      const effectiveIsActive = override ? override.isActive : emp.isActive;
      return effectiveIsActive;
    });

    // Get effective overhead type active status
    const overheadTypeOverrides = await getOverheadTypeOverrides(viewId);
    const overheadType = await db.overheadType.findUnique({
      where: { id: overheadTypeId },
    });
    if (!overheadType) {
      return { success: false, error: "Overhead type not found" };
    }
    const overheadTypeOverride = overheadTypeOverrides.get(overheadTypeId);
    const effectiveOverheadTypeActive = overheadTypeOverride
      ? overheadTypeOverride.isActive
      : overheadType.isActive;
    if (!effectiveOverheadTypeActive) {
      return { success: false, error: "Overhead type is not active in this view" };
    }

    if (effectiveActiveEmployees.length === 0) {
      return { success: false, error: "No active employees found in this view" };
    }

    // Import getAdjustedGrossMonthly
    const { getAdjustedGrossMonthly } = await import("@/lib/pricing");

    // Calculate total adjusted gross monthly
    const totalAdjustedGross = effectiveActiveEmployees.reduce((sum, emp) => {
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
      const adjustedGross = getAdjustedGrossMonthly(employeeForCalc, annualIncrease);
      return sum + adjustedGross;
    }, 0);

    if (totalAdjustedGross === 0) {
      return { success: false, error: "Total adjusted gross monthly is zero" };
    }

    await db.$transaction(
      effectiveActiveEmployees.map((emp) => {
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
        const adjustedGross = getAdjustedGrossMonthly(employeeForCalc, annualIncrease);
        const share = adjustedGross / totalAdjustedGross;
        return db.overheadAllocationOverride.upsert({
          where: {
            viewId_employeeId_overheadTypeId: {
              viewId,
              employeeId: emp.id,
              overheadTypeId,
            },
          },
          create: {
            viewId,
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

    revalidatePath(`/views/${viewId}`);
    revalidatePath("/");
    revalidatePath("/results");
    revalidatePath("/overheads");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to allocate proportional to gross" };
  }
}

/**
 * Normalize allocations to 100% for a view (updates allocation overrides)
 * Only works on effective active employees and effective active overhead types
 */
export async function normalizeTo100PercentForView(viewId: string, overheadTypeId: string) {
  try {
    // Get effective employee active status
    const employeeOverrides = await getEmployeeOverrides(viewId);
    const effectiveActiveEmployeeIds = new Set<string>();
    const allEmployees = await db.employee.findMany();
    allEmployees.forEach((emp) => {
      const override = employeeOverrides.get(emp.id);
      const effectiveIsActive = override ? override.isActive : emp.isActive;
      if (effectiveIsActive) {
        effectiveActiveEmployeeIds.add(emp.id);
      }
    });

    // Get effective overhead type active status
    const overheadTypeOverrides = await getOverheadTypeOverrides(viewId);
    const overheadType = await db.overheadType.findUnique({
      where: { id: overheadTypeId },
    });
    if (!overheadType) {
      return { success: false, error: "Overhead type not found" };
    }
    const overheadTypeOverride = overheadTypeOverrides.get(overheadTypeId);
    const effectiveOverheadTypeActive = overheadTypeOverride
      ? overheadTypeOverride.isActive
      : overheadType.isActive;
    if (!effectiveOverheadTypeActive) {
      return { success: false, error: "Overhead type is not active in this view" };
    }

    // Get all allocation overrides for this view and overhead type
    const overrides = await db.overheadAllocationOverride.findMany({
      where: {
        viewId,
        overheadTypeId,
        employeeId: { in: Array.from(effectiveActiveEmployeeIds) },
      },
    });

    // Get base allocations for employees without overrides
    const overrideEmployeeIds = new Set(overrides.map((o) => o.employeeId));
    const baseAllocations = await db.overheadAllocation.findMany({
      where: {
        overheadTypeId,
        employeeId: {
          in: Array.from(effectiveActiveEmployeeIds).filter(
            (id) => !overrideEmployeeIds.has(id)
          ),
        },
      },
    });

    // Combine overrides and base allocations
    const allAllocations: Array<{ employeeId: string; share: number }> = [];
    overrides.forEach((o) => {
      allAllocations.push({ employeeId: o.employeeId, share: o.share });
    });
    baseAllocations.forEach((a) => {
      allAllocations.push({ employeeId: a.employeeId, share: a.share });
    });

    if (allAllocations.length === 0) {
      return { success: false, error: "No active allocations found for this overhead type" };
    }

    // Calculate total
    const total = allAllocations.reduce((sum, alloc) => sum + alloc.share, 0);

    if (total === 0) {
      return { success: false, error: "All shares are zero" };
    }

    // Normalize each allocation (update overrides or create new ones)
    await db.$transaction(
      allAllocations.map((alloc) => {
        const normalizedShare = alloc.share / total;
        const hasOverride = overrideEmployeeIds.has(alloc.employeeId);
        if (hasOverride) {
          // Update existing override
          return db.overheadAllocationOverride.update({
            where: {
              viewId_employeeId_overheadTypeId: {
                viewId,
                employeeId: alloc.employeeId,
                overheadTypeId,
              },
            },
            data: { share: normalizedShare },
          });
        } else {
          // Create new override
          return db.overheadAllocationOverride.create({
            data: {
              viewId,
              employeeId: alloc.employeeId,
              overheadTypeId,
              share: normalizedShare,
            },
          });
        }
      })
    );

    revalidatePath(`/views/${viewId}`);
    revalidatePath("/");
    revalidatePath("/results");
    revalidatePath("/overheads");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to normalize to 100%" };
  }
}

