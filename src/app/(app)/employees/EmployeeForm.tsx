"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createEmployee } from "./actions";
import { toast } from "sonner";
import { getExchangeRatio, type Settings } from "@/lib/pricing";

interface EmployeeFormProps {
  techStacks: Array<{ id: string; name: string }>;
  settings: Settings;
}

export function EmployeeForm({ techStacks, settings }: EmployeeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState<string>("");
  const exchangeRatio = getExchangeRatio(settings);
  const currency = exchangeRatio && exchangeRatio > 0 ? "USD" : "EGP";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createEmployee(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Employee created successfully");
        e.currentTarget.reset();
        setCategory("");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Employee</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required disabled={isPending} />
            </div>
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                name="category"
                value={category}
                onValueChange={setCategory}
                required
                disabled={isPending}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEV">DEV</SelectItem>
                  <SelectItem value="QA">QA</SelectItem>
                  <SelectItem value="BA">BA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {category === "DEV" && (
              <div>
                <Label htmlFor="techStackId">Tech Stack *</Label>
                <Select name="techStackId" required disabled={isPending}>
                  <SelectTrigger id="techStackId">
                    <SelectValue placeholder="Select stack" />
                  </SelectTrigger>
                  <SelectContent>
                    {techStacks.map((stack) => (
                      <SelectItem key={stack.id} value={stack.id}>
                        {stack.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="fte">FTE</Label>
              <Input
                id="fte"
                name="fte"
                type="number"
                step="0.01"
                min="0"
                defaultValue="1.0"
                disabled={isPending}
              />
            </div>
            <div>
              <Label htmlFor="grossMonthly">Gross Monthly ({currency}) *</Label>
              <Input
                id="grossMonthly"
                name="grossMonthly"
                type="number"
                step="0.01"
                min="0"
                required
                disabled={isPending}
              />
            </div>
            <div>
              <Label htmlFor="netMonthly">Net Monthly ({currency}) *</Label>
              <Input
                id="netMonthly"
                name="netMonthly"
                type="number"
                step="0.01"
                min="0"
                required
                disabled={isPending}
              />
            </div>
            <div>
              <Label htmlFor="oncostRate">Oncost Rate</Label>
              <Input
                id="oncostRate"
                name="oncostRate"
                type="number"
                step="0.01"
                min="0"
                disabled={isPending}
              />
            </div>
            <div>
              <Label htmlFor="annualBenefits">Annual Benefits ({currency})</Label>
              <Input
                id="annualBenefits"
                name="annualBenefits"
                type="number"
                step="0.01"
                min="0"
                disabled={isPending}
              />
            </div>
            <div>
              <Label htmlFor="annualBonus">Annual Bonus ({currency})</Label>
              <Input
                id="annualBonus"
                name="annualBonus"
                type="number"
                step="0.01"
                min="0"
                disabled={isPending}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                defaultChecked
                className="h-4 w-4"
                disabled={isPending}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create Employee"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
