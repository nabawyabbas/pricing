"use server";

import { db } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function loginAction(username: string, password: string) {
  // Find user by username
  const user = await db.user.findUnique({
    where: { username },
  });

  if (!user) {
    return { error: "Invalid username or password" };
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    return { error: "Invalid username or password" };
  }

  // Check if user is active
  if (!user.isActive) {
    return { error: "Account is deactivated" };
  }

  // Create session (sets cookie)
  await createSession(user.id);

  // Redirect to dashboard (this throws a special error that Next.js handles)
  redirect("/");
}


