import { requireAdmin } from "@/lib/requireAdmin";
import { AppShell } from "@/components/app-shell";
import { AppShellActionsProvider } from "@/components/app-shell-actions";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enforce admin access - this is the REAL security enforcement
  await requireAdmin();

  return (
    <AppShellActionsProvider>
      <AppShell>{children}</AppShell>
    </AppShellActionsProvider>
  );
}
