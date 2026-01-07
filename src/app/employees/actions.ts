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

export async function createEmployee(formData: FormData) {
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const techStackId = formData.get("techStackId") as string | null;
  const grossMonthly = formData.get("grossMonthly") as string;
  const netMonthly = formData.get("netMonthly") as string;
  const oncostRate = formData.get("oncostRate") as string | null;
  const annualBenefits = formData.get("annualBenefits") as string | null;
  const annualBonus = formData.get("annualBonus") as string | null;
  const fte = formData.get("fte") as string;

  // Validation
  if (!name || name.trim() === "") {
    return { error: "Name is required" };
  }
  if (!category || !["DEV", "QA", "BA"].includes(category)) {
    return { error: "Valid category is required" };
  }
  if (category === "DEV" && !techStackId) {
    return { error: "Tech stack is required for DEV employees" };
  }
  if (!grossMonthly || !netMonthly) {
    return { error: "Gross and net monthly are required" };
  }

  try {
    await db.employee.create({
      data: {
        name: name.trim(),
        category: category as "DEV" | "QA" | "BA",
        techStackId: techStackId || null,
        grossMonthly: new Prisma.Decimal(grossMonthly),
        netMonthly: new Prisma.Decimal(netMonthly),
        oncostRate: parseFloatValue(oncostRate),
        annualBenefits: parseDecimal(annualBenefits),
        annualBonus: parseDecimal(annualBonus),
        fte: fte ? parseFloatValue(fte) || 1.0 : 1.0,
      },
    });
    revalidatePath("/employees");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { error: "An employee with this name already exists" };
    }
    if (error.code === "P2003") {
      return { error: "Invalid tech stack selected" };
    }
    return { error: "Failed to create employee" };
  }
}

export async function updateEmployee(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const techStackId = formData.get("techStackId") as string | null;
  const grossMonthly = formData.get("grossMonthly") as string;
  const netMonthly = formData.get("netMonthly") as string;
  const oncostRate = formData.get("oncostRate") as string | null;
  const annualBenefits = formData.get("annualBenefits") as string | null;
  const annualBonus = formData.get("annualBonus") as string | null;
  const fte = formData.get("fte") as string;

  if (!id || !name || name.trim() === "") {
    return { error: "ID and name are required" };
  }
  if (!category || !["DEV", "QA", "BA"].includes(category)) {
    return { error: "Valid category is required" };
  }
  if (category === "DEV" && !techStackId) {
    return { error: "Tech stack is required for DEV employees" };
  }
  if (!grossMonthly || !netMonthly) {
    return { error: "Gross and net monthly are required" };
  }

  try {
    await db.employee.update({
      where: { id },
      data: {
        name: name.trim(),
        category: category as "DEV" | "QA" | "BA",
        techStackId: techStackId || null,
        grossMonthly: new Prisma.Decimal(grossMonthly),
        netMonthly: new Prisma.Decimal(netMonthly),
        oncostRate: parseFloatValue(oncostRate),
        annualBenefits: parseDecimal(annualBenefits),
        annualBonus: parseDecimal(annualBonus),
        fte: fte ? parseFloatValue(fte) || 1.0 : 1.0,
      },
    });
    revalidatePath("/employees");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { error: "An employee with this name already exists" };
    }
    if (error.code === "P2025") {
      return { error: "Employee not found" };
    }
    if (error.code === "P2003") {
      return { error: "Invalid tech stack selected" };
    }
    return { error: "Failed to update employee" };
  }
}

export async function deleteEmployee(formData: FormData) {
  const id = formData.get("id") as string;

  if (!id) {
    return { error: "ID is required" };
  }

  try {
    await db.employee.delete({
      where: { id },
    });
    revalidatePath("/employees");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2025") {
      return { error: "Employee not found" };
    }
    return { error: "Failed to delete employee" };
  }
}

