"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Prisma } from "@prisma/client";
import {
  updateOverheadAllocation,
  allocateEqually,
  allocateProportionalToGross,
  normalizeTo100Percent,
} from "./actions";
import { toast } from "sonner";
import { formatMoney, formatPercent, formatNumber } from "@/lib/format";

interface EnhancedAllocationGridProps {
  employees: Array<{
    id: string;
    name: string;
    category: string;
    isActive: boolean;
    techStack: { name: string } | null;
    grossMonthly: Prisma.Decimal;
    overheadAllocs: Array<{
      id: string;
      overheadTypeId: string;
      share: number;
      overheadType: { name: string; isActive: boolean };
    }>;
  }>;
  overheadTypes: Array<{
    id: string;
    name: string;
    isActive: boolean;
  }>;
  totalsByType: Map<string, number>;
  missingAllocationsByType: Map<string, number>;
}

export function EnhancedAllocationGrid({
  employees,
  overheadTypes,
  totalsByType,
  missingAllocationsByType,
}: EnhancedAllocationGridProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingCells, setEditingCells] = useState<Map<string, string>>(new Map());
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [showInactive, setShowInactive] = useState(false);

  // Filter to active items by default
  const displayEmployees = showInactive ? employees : employees.filter((e) => e.isActive);
  const displayOverheadTypes = showInactive ? overheadTypes : overheadTypes.filter((t) => t.isActive);

  const getShare = (employeeId: string, overheadTypeId: string): number => {
    const employee = employees.find((e) => e.id === employeeId);
    const alloc = employee?.overheadAllocs.find((a) => a.overheadTypeId === overheadTypeId);
    return alloc?.share ?? 0;
  };

  const getEditingValue = (employeeId: string, overheadTypeId: string): string => {
    const key = `${employeeId}-${overheadTypeId}`;
    if (editingCells.has(key)) {
      return editingCells.get(key)!;
    }
    return formatPercent(getShare(employeeId, overheadTypeId), "decimal", 2).replace("%", "");
  };

  const handleChange = (employeeId: string, overheadTypeId: string, value: string) => {
    const key = `${employeeId}-${overheadTypeId}`;
    setEditingCells(new Map(editingCells.set(key, value)));

    const existingTimeout = timeoutRefs.current.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      submitAllocation(employeeId, overheadTypeId, value);
      editingCells.delete(key);
      setEditingCells(new Map(editingCells));
    }, 1000);
    timeoutRefs.current.set(key, timeout);
  };

  const handleBlur = (employeeId: string, overheadTypeId: string) => {
    const key = `${employeeId}-${overheadTypeId}`;
    const existingTimeout = timeoutRefs.current.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    const value = editingCells.get(key);
    if (value !== undefined) {
      submitAllocation(employeeId, overheadTypeId, value);
      editingCells.delete(key);
      setEditingCells(new Map(editingCells));
    }
  };

  async function submitAllocation(employeeId: string, overheadTypeId: string, value: string) {
    const numValue = Number.parseFloat(value);
    if (isNaN(numValue) || numValue < 0) {
      return;
    }
    const share = numValue / 100;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("employeeId", employeeId);
      formData.set("overheadTypeId", overheadTypeId);
      formData.set("share", share.toString());
      const result = await updateOverheadAllocation(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        router.refresh();
      }
    });
  }

  const getTotalForEmployee = (employeeId: string): number => {
    return displayOverheadTypes.reduce((sum, type) => sum + getShare(employeeId, type.id), 0);
  };

  async function handleAllocateEqually(overheadTypeId: string) {
    startTransition(async () => {
      const result = await allocateEqually(overheadTypeId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Allocated equally successfully");
        router.refresh();
      }
    });
  }

  async function handleAllocateProportional(overheadTypeId: string) {
    startTransition(async () => {
      const result = await allocateProportionalToGross(overheadTypeId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Allocated proportional to gross successfully");
        router.refresh();
      }
    });
  }

  async function handleNormalize(overheadTypeId: string) {
    startTransition(async () => {
      const result = await normalizeTo100Percent(overheadTypeId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Normalized to 100% successfully");
        router.refresh();
      }
    });
  }

  const inactiveEmployeeCount = employees.filter((e) => !e.isActive).length;
  const inactiveOverheadCount = overheadTypes.filter((t) => !t.isActive).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Allocation Grid</CardTitle>
          {(inactiveEmployeeCount > 0 || inactiveOverheadCount > 0) && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-inactive-grid"
                checked={showInactive}
                onCheckedChange={(checked) => setShowInactive(checked === true)}
              />
              <Label htmlFor="show-inactive-grid" className="text-sm cursor-pointer">
                Show Inactive ({inactiveEmployeeCount} employees, {inactiveOverheadCount} overhead
                types)
              </Label>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Per-overhead metrics */}
        {displayOverheadTypes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayOverheadTypes.map((type) => {
              const total = totalsByType.get(type.id) ?? 0;
              const missing = missingAllocationsByType.get(type.id) ?? 0;
              const isWarning = Math.abs(total - 1) > 0.01;

              return (
                <div
                  key={type.id}
                  className={`p-4 border rounded-md ${
                    isWarning
                      ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
                      : "border-green-500 bg-green-50 dark:bg-green-950"
                  }`}
                >
                  <div className="font-semibold mb-2">{type.name}</div>
                  <div className="text-sm space-y-1">
                    <div>
                      Allocation Sum:{" "}
                        <span
                          className={
                            isWarning ? "text-destructive font-medium" : "text-green-600 font-medium"
                          }
                        >
                          {formatPercent(total, "decimal")}
                        </span>
                    </div>
                    <div>
                      Missing Allocations: <span className="font-medium">{missing}</span> employee(s)
                    </div>
                    {isWarning && (
                      <div className="text-xs text-yellow-600 mt-1">⚠️ Should sum to 100%</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action buttons per overhead type */}
        {displayOverheadTypes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {displayOverheadTypes.map((type) => (
              <div
                key={type.id}
                className="flex items-center gap-2 p-2 border rounded-md bg-muted/50"
              >
                <span className="text-sm font-medium">{type.name}:</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAllocateEqually(type.id)}
                  disabled={isPending}
                >
                  Allocate Equally
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAllocateProportional(type.id)}
                  disabled={isPending}
                >
                  Proportional to Gross
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleNormalize(type.id)}
                  disabled={isPending}
                >
                  Normalize
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Allocation Grid Table */}
        {displayOverheadTypes.length > 0 && displayEmployees.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10">Employee</TableHead>
                  <TableHead className="sticky left-[150px] bg-background z-10">Category</TableHead>
                  <TableHead>Tech Stack</TableHead>
                  <TableHead className="text-right">Gross Monthly</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  {displayOverheadTypes.map((type) => (
                    <TableHead key={type.id} className="text-center min-w-[120px]">
                      {type.name} {!type.isActive && "(Inactive)"} (%)
                    </TableHead>
                  ))}
                  <TableHead className="text-center">Total %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayEmployees.map((employee) => {
                  const employeeTotal = getTotalForEmployee(employee.id);
                  const isEmployeeInactive = !employee.isActive;

                  return (
                    <TableRow
                      key={employee.id}
                      className={isEmployeeInactive ? "opacity-60" : ""}
                    >
                      <TableCell className="sticky left-0 bg-background z-10 font-medium">
                        {employee.name}
                      </TableCell>
                      <TableCell className="sticky left-[150px] bg-background z-10">
                        <Badge
                          variant={
                            employee.category === "DEV"
                              ? "default"
                              : employee.category === "QA"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {employee.category}
                        </Badge>
                      </TableCell>
                      <TableCell>{employee.techStack?.name || "-"}</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(Number(employee.grossMonthly), "EGP")}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={employee.isActive ? "default" : "secondary"}>
                          {employee.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      {displayOverheadTypes.map((type) => {
                        const share = getShare(employee.id, type.id);
                        const displayValue = getEditingValue(employee.id, type.id);
                        const isTypeInactive = !type.isActive;
                        const canEdit = employee.isActive && type.isActive;

                        return (
                          <TableCell
                            key={type.id}
                            className={`text-center ${isTypeInactive ? "bg-muted/50" : ""}`}
                          >
                            {canEdit ? (
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={displayValue}
                                onChange={(e) => handleChange(employee.id, type.id, e.target.value)}
                                onBlur={() => handleBlur(employee.id, type.id)}
                                className="w-20 text-center"
                                placeholder="0.00"
                              />
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                {isEmployeeInactive || isTypeInactive ? "-" : displayValue}
                              </span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        <span className="text-sm font-medium">
                          {formatPercent(employeeTotal, "decimal")}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Totals row */}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={5} className="text-right">
                    Totals (Active Only):
                  </TableCell>
                  {displayOverheadTypes.map((type) => {
                    const total = totalsByType.get(type.id) ?? 0;
                    const isWarning = Math.abs(total - 1) > 0.01;
                    const isTypeInactive = !type.isActive;

                    return (
                      <TableCell
                        key={type.id}
                        className={`text-center ${
                          isTypeInactive
                            ? "text-muted-foreground"
                            : isWarning
                            ? "text-destructive"
                            : "text-green-600"
                        }`}
                      >
                        {isTypeInactive ? "-" : formatPercent(total, "decimal")}
                      </TableCell>
                    );
                  })}
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8 border rounded-md">
            {displayOverheadTypes.length === 0
              ? "No overhead types available. Create overhead types first."
              : "No employees available. Create employees first."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
