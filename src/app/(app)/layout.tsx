import { AppShell } from "@/components/app-shell";
import { AppShellActionsProvider } from "@/components/app-shell-actions";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShellActionsProvider>
      <AppShell>{children}</AppShell>
    </AppShellActionsProvider>
  );
}

