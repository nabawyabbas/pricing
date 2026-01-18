/**
 * Helper functions for computing effective active status with view overrides
 */

import { db } from "./db";

export type EffectiveActiveStatus = {
  isActive: boolean;
  isOverridden: boolean;
};

/**
 * Compute effective active status for an employee
 * effective = override?.isActive ?? base.isActive
 */
export function computeEffectiveEmployeeActive(
  baseIsActive: boolean,
  override: { isActive: boolean } | null
): EffectiveActiveStatus {
  if (override === null) {
    return {
      isActive: baseIsActive,
      isOverridden: false,
    };
  }
  return {
    isActive: override.isActive,
    isOverridden: override.isActive !== baseIsActive,
  };
}

/**
 * Compute effective active status for an overhead type
 * effective = override?.isActive ?? base.isActive
 */
export function computeEffectiveOverheadTypeActive(
  baseIsActive: boolean,
  override: { isActive: boolean } | null
): EffectiveActiveStatus {
  if (override === null) {
    return {
      isActive: baseIsActive,
      isOverridden: false,
    };
  }
  return {
    isActive: override.isActive,
    isOverridden: override.isActive !== baseIsActive,
  };
}

/**
 * Fetch employee overrides for a view
 */
export async function getEmployeeOverrides(viewId: string) {
  const overrides = await db.employeeActiveOverride.findMany({
    where: { viewId },
    select: {
      employeeId: true,
      isActive: true,
    },
  });
  return new Map(overrides.map((o) => [o.employeeId, o]));
}

/**
 * Fetch overhead type overrides for a view
 */
export async function getOverheadTypeOverrides(viewId: string) {
  const overrides = await db.overheadTypeActiveOverride.findMany({
    where: { viewId },
    select: {
      overheadTypeId: true,
      isActive: true,
    },
  });
  return new Map(overrides.map((o) => [o.overheadTypeId, o]));
}


