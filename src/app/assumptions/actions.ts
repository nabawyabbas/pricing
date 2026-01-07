"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

function parseFloatValue(value: string | null): number | null {
  if (!value || value.trim() === "") return null;
  const parsed = Number.parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

export async function updateAssumptions(formData: FormData) {
  const devReleasableHoursPerMonth = formData.get("devReleasableHoursPerMonth") as string;
  const standardHoursPerMonth = formData.get("standardHoursPerMonth") as string;
  const qaRatio = formData.get("qaRatio") as string;
  const baRatio = formData.get("baRatio") as string;
  const margin = formData.get("margin") as string;
  const risk = formData.get("risk") as string;

  // Validation
  if (!devReleasableHoursPerMonth || !standardHoursPerMonth) {
    return { error: "Dev releasable hours and standard hours are required" };
  }

  const devReleasableHours = parseFloatValue(devReleasableHoursPerMonth);
  const standardHours = parseFloatValue(standardHoursPerMonth);
  const qaRatioValue = parseFloatValue(qaRatio);
  const baRatioValue = parseFloatValue(baRatio);
  const marginValue = parseFloatValue(margin);
  const riskValue = parseFloatValue(risk);

  if (devReleasableHours === null || standardHours === null) {
    return { error: "Dev releasable hours and standard hours must be valid numbers" };
  }

  if (devReleasableHours <= 0 || standardHours <= 0) {
    return { error: "Hours must be greater than zero" };
  }

  if (qaRatioValue !== null && (qaRatioValue < 0 || qaRatioValue > 1)) {
    return { error: "QA ratio must be between 0 and 1" };
  }

  if (baRatioValue !== null && (baRatioValue < 0 || baRatioValue > 1)) {
    return { error: "BA ratio must be between 0 and 1" };
  }

  if (marginValue !== null && marginValue < 0) {
    return { error: "Margin must be non-negative" };
  }

  if (riskValue !== null && riskValue < 0) {
    return { error: "Risk must be non-negative" };
  }

  try {
    // Get or create the single Assumptions record
    const existing = await db.assumptions.findFirst();

    const data = {
      devReleasableHoursPerMonth: devReleasableHours,
      standardHoursPerMonth: standardHours,
      qaRatio: qaRatioValue ?? 0.5,
      baRatio: baRatioValue ?? 0.25,
      margin: marginValue ?? 0.2,
      risk: riskValue ?? 0.1,
    };

    if (existing) {
      await db.assumptions.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await db.assumptions.create({
        data,
      });
    }

    revalidatePath("/assumptions");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to update assumptions" };
  }
}

