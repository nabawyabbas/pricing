"use server";

import { db } from "@/lib/db";
import { getEffectiveSettings } from "@/lib/effective-settings";
import {
  getEmployeeOverrides,
  computeEffectiveEmployeeActive,
} from "@/lib/views";
import { formatTenureSince } from "@/utils/tenure";
import { getExchangeRatio } from "@/lib/pricing";

export interface InactiveEmployeeRow {
  id: string;
  name: string;
  grossUsd: number;
  tenureText: string;
}

/**
 * Get inactive employees for the dashboard card drilldown
 * Respects view overrides if viewId is provided
 */
export async function getInactiveEmployeesForCard(
  viewId: string | null | undefined
): Promise<InactiveEmployeeRow[]> {
  // Get effective settings to read exchange_ratio
  const settings = await getEffectiveSettings(viewId);
  const exchangeRatio = getExchangeRatio(settings);

  // Load all employees
  const allEmployees = await db.employee.findMany({
    select: {
      id: true,
      name: true,
      grossMonthly: true,
      hiringDate: true,
      isActive: true,
    },
    orderBy: { name: "asc" },
  });

  // Get view overrides if viewId is provided
  const employeeOverrides = viewId ? await getEmployeeOverrides(viewId) : new Map();

  // Compute effective active status
  const inactiveEmployees = allEmployees.filter((emp) => {
    const override = employeeOverrides.get(emp.id) || null;
    const effective = computeEffectiveEmployeeActive(emp.isActive, override);
    return !effective.isActive; // Return only inactive employees
  });

  // Convert to rows
  const now = new Date();
  const rows: InactiveEmployeeRow[] = inactiveEmployees.map((emp) => {
    const grossMonthly = Number(emp.grossMonthly);
    // Convert to USD if exchange ratio is provided, otherwise use EGP value
    const grossUsd = exchangeRatio && exchangeRatio > 0 
      ? grossMonthly / exchangeRatio 
      : grossMonthly;

    const tenureText = emp.hiringDate 
      ? formatTenureSince(emp.hiringDate, now)
      : "—";

    return {
      id: emp.id,
      name: emp.name,
      grossUsd,
      tenureText,
    };
  });

  return rows;
}

