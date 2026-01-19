import { redirect } from "next/navigation";
import { getSessionUser } from "./auth";

/**
 * Require admin access - redirects to /login if not authenticated
 * or /not-authorized if not admin
 * Returns the user object if admin
 */
export async function requireAdmin() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/not-authorized");
  }

  return user;
}
