"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createTechStack(formData: FormData) {
  const name = formData.get("name") as string;

  if (!name || name.trim() === "") {
    return { error: "Name is required" };
  }

  try {
    await db.techStack.create({
      data: {
        name: name.trim(),
      },
    });
    revalidatePath("/stacks");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { error: "A tech stack with this name already exists" };
    }
    return { error: "Failed to create tech stack" };
  }
}

export async function updateTechStack(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;

  if (!id || !name || name.trim() === "") {
    return { error: "ID and name are required" };
  }

  try {
    await db.techStack.update({
      where: { id },
      data: {
        name: name.trim(),
      },
    });
    revalidatePath("/stacks");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { error: "A tech stack with this name already exists" };
    }
    if (error.code === "P2025") {
      return { error: "Tech stack not found" };
    }
    return { error: "Failed to update tech stack" };
  }
}

export async function deleteTechStack(formData: FormData) {
  const id = formData.get("id") as string;

  if (!id) {
    return { error: "ID is required" };
  }

  try {
    await db.techStack.delete({
      where: { id },
    });
    revalidatePath("/stacks");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2025") {
      return { error: "Tech stack not found" };
    }
    return { error: "Failed to delete tech stack" };
  }
}

