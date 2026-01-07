"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resetCoreDefaults } from "./actions";
import { toast } from "sonner";

export function ResetDefaultsButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleReset() {
    startTransition(async () => {
      const result = await resetCoreDefaults();
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Core defaults reset successfully");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset Core Defaults</CardTitle>
        <CardDescription>
          Reset core settings to defaults: Dev Hours = 100, Standard Hours = 160, QA Ratio = 0.5,
          BA Ratio = 0.25
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleReset} disabled={isPending}>
          {isPending ? "Resetting..." : "Reset Defaults"}
        </Button>
      </CardContent>
    </Card>
  );
}
