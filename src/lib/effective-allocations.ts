/**
 * Helper functions for computing effective overhead allocations with view overrides
 */

import { db } from "./db";
import { type Employee, type OverheadType } from "./pricing";

export type EffectiveAllocation = {
  overheadTypeId: string;
  share: number;
};

/**
 * Get effective overhead allocations for employees
 * Merges base allocations with view overrides
 * 
 * @param viewId - Optional view ID to apply overrides
 * @param employees - Array of employees with base overheadAllocs
 * @param overheadTypes - Array of overhead types (for filtering active)
 * @param effectiveEmployeeActive - Map of employeeId -> effective isActive
 * @param effectiveOverheadTypeActive - Map of overheadTypeId -> effective isActive
 * @returns Map of employeeId -> effective allocations array
 */
export async function getEffectiveOverheadAllocs(
  viewId: string | null | undefined,
  employees: Employee[],
  overheadTypes: OverheadType[],
  effectiveEmployeeActive: Map<string, boolean>,
  effectiveOverheadTypeActive: Map<string, boolean>
): Promise<Map<string, EffectiveAllocation[]>> {
  // Create a map of base allocations by employee
  const baseAllocsByEmployee = new Map<string, Map<string, number>>();
  employees.forEach((emp) => {
    const allocsMap = new Map<string, number>();
    emp.overheadAllocs?.forEach((alloc) => {
      allocsMap.set(alloc.overheadTypeId, alloc.share);
    });
    baseAllocsByEmployee.set(emp.id, allocsMap);
  });

  // If no viewId, return base allocations (filtered by effective active status)
  if (!viewId) {
    const result = new Map<string, EffectiveAllocation[]>();
    employees.forEach((emp) => {
      const isEmployeeActive = effectiveEmployeeActive.get(emp.id) ?? true;
      if (!isEmployeeActive) {
        result.set(emp.id, []);
        return;
      }

      const effectiveAllocs: EffectiveAllocation[] = [];
      (emp.overheadAllocs || []).forEach((alloc) => {
        const isTypeActive = effectiveOverheadTypeActive.get(alloc.overheadTypeId) ?? true;
        if (isTypeActive && alloc.share > 0) {
          effectiveAllocs.push({
            overheadTypeId: alloc.overheadTypeId,
            share: alloc.share,
          });
        }
      });
      result.set(emp.id, effectiveAllocs);
    });
    return result;
  }

  // Load overrides for the view
  const overrides = await db.overheadAllocationOverride.findMany({
    where: { viewId },
    select: {
      employeeId: true,
      overheadTypeId: true,
      share: true,
    },
  });

  // Create a map of overrides by composite key (employeeId + overheadTypeId)
  const overridesMap = new Map<string, number>();
  overrides.forEach((override) => {
    const key = `${override.employeeId}:${override.overheadTypeId}`;
    overridesMap.set(key, override.share);
  });

  // Merge base allocations with overrides
  const result = new Map<string, EffectiveAllocation[]>();
  employees.forEach((emp) => {
    const isEmployeeActive = effectiveEmployeeActive.get(emp.id) ?? true;
    if (!isEmployeeActive) {
      result.set(emp.id, []);
      return;
    }

    const effectiveAllocs: EffectiveAllocation[] = [];
    const processedTypes = new Set<string>();

    // Process base allocations
    (emp.overheadAllocs || []).forEach((alloc) => {
      const isTypeActive = effectiveOverheadTypeActive.get(alloc.overheadTypeId) ?? true;
      if (!isTypeActive) {
        processedTypes.add(alloc.overheadTypeId);
        return;
      }

      const overrideKey = `${emp.id}:${alloc.overheadTypeId}`;
      const overrideShare = overridesMap.get(overrideKey);
      const effectiveShare = overrideShare !== undefined ? overrideShare : alloc.share;

      if (effectiveShare > 0) {
        effectiveAllocs.push({
          overheadTypeId: alloc.overheadTypeId,
          share: effectiveShare,
        });
      }
      processedTypes.add(alloc.overheadTypeId);
    });

    // Process override-only rows (overrides without base allocations)
    overrides.forEach((override) => {
      if (override.employeeId === emp.id && !processedTypes.has(override.overheadTypeId)) {
        const isTypeActive = effectiveOverheadTypeActive.get(override.overheadTypeId) ?? true;
        if (isTypeActive && override.share > 0) {
          effectiveAllocs.push({
            overheadTypeId: override.overheadTypeId,
            share: override.share,
          });
        }
      }
    });

    result.set(emp.id, effectiveAllocs);
  });

  return result;
}

