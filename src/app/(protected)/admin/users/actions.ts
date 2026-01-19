"use server";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";

export async function createUser(username: string, password: string) {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }

  try {
    const passwordHash = await hashPassword(password);

    await db.user.create({
      data: {
        username: username.trim(),
        passwordHash,
        role: "ADMIN",
        isActive: true,
      },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { error: "Username already exists" };
    }
    return { error: "Failed to create user" };
  }
}

export async function toggleUserActive(userId: string) {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }

  // Prevent self-deactivation
  if (currentUser.id === userId) {
    return { error: "Cannot deactivate your own account" };
  }

  try {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { error: "User not found" };
    }

    await db.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to update user" };
  }
}


