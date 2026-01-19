"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSetting } from "./actions";
import { toast } from "sonner";

export function SettingsForm() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createSetting(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Setting created successfully");
        e.currentTarget.reset();
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Setting</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="key">Key *</Label>
              <Input
                id="key"
                name="key"
                required
                disabled={isPending}
                placeholder="e.g., dev_releasable_hours_per_month"
              />
            </div>
            <div>
              <Label htmlFor="value">Value *</Label>
              <Input
                id="value"
                name="value"
                required
                disabled={isPending}
                placeholder="e.g., 100"
              />
            </div>
            <div>
              <Label htmlFor="valueType">Type *</Label>
              <Select name="valueType" required disabled={isPending}>
                <SelectTrigger id="valueType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="float">Float</SelectItem>
                  <SelectItem value="integer">Integer</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="group">Group</Label>
              <Input
                id="group"
                name="group"
                disabled={isPending}
                placeholder="e.g., Assumptions"
              />
            </div>
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                name="unit"
                disabled={isPending}
                placeholder="e.g., hours/month"
              />
            </div>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create Setting"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
