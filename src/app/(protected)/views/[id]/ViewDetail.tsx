"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  setEmployeeOverride,
  setOverheadTypeOverride,
  setSettingOverride,
  setAllocationOverride,
  allocateEquallyForView,
  allocateProportionalToGrossForView,
  normalizeTo100PercentForView,
} from "../actions";
import { toast } from "sonner";
import {
  computeEffectiveEmployeeActive,
  computeEffectiveOverheadTypeActive,
} from "@/lib/views";
import { formatMoney, formatPercent, formatNumber } from "@/lib/format";
import { SETTINGS_METADATA, type SettingMetadata } from "@/app/(protected)/settings/settingsMetadata";
import { type Settings } from "@/lib/pricing";
import { AllocationCell } from "./AllocationCell";

interface ViewDetailProps {
  view: {
    id: string;
    name: string;
  };
  employees: Array<{
    id: string;
    name: string;
    category: string;
    techStack: { name: string } | null;
    isActive: boolean;
    grossMonthly: number;
  }>;
  overheadTypes: Array<{
    id: string;
    name: string;
    isActive: boolean;
    amount: number;
  }>;
  settings: Array<{
    id: string;
    key: string;
    value: string;
    valueType: string;
    group: string;
    unit: string | null;
  }>;
  employeeOverrides: Map<string, { isActive: boolean }>;
  overheadTypeOverrides: Map<string, { isActive: boolean }>;
  settingOverrides: Map<string, {
    id: string;
    key: string;
    value: string;
    valueType: string;
    group: string | null;
    unit: string | null;
  }>;
  effectiveSettings: Settings;
  baseAllocations: Array<{
    employeeId: string;
    overheadTypeId: string;
    share: number;
  }>;
  allocationOverrides: Map<string, { share: number }>;
}

export function ViewDetail({
  view,
  employees,
  overheadTypes,
  settings,
  employeeOverrides,
  overheadTypeOverrides,
  settingOverrides,
  effectiveSettings,
  baseAllocations,
  allocationOverrides,
}: ViewDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingSetting, setEditingSetting] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const handleEmployeeToggle = (employeeId: string, currentEffective: boolean) => {
    startTransition(async () => {
      const result = await setEmployeeOverride(view.id, employeeId, !currentEffective);
      if (result.success) {
        toast.success("Employee override updated");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update override");
      }
    });
  };

  const handleOverheadTypeToggle = (overheadTypeId: string, currentEffective: boolean) => {
    startTransition(async () => {
      const result = await setOverheadTypeOverride(view.id, overheadTypeId, !currentEffective);
      if (result.success) {
        toast.success("Overhead type override updated");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update override");
      }
    });
  };

  const handleSettingEdit = (setting: {
    key: string;
    value: string;
    valueType: string;
    group: string;
    unit: string | null;
  }) => {
    setEditingSetting(setting.key);
    setEditValue(setting.value);
  };

  const handleSettingSave = (setting: {
    key: string;
    value: string;
    valueType: string;
    group: string;
    unit: string | null;
  }) => {
    startTransition(async () => {
      const override = settingOverrides.get(setting.key);
      const globalValue = setting.value;
      
      // If editValue matches global, delete override (revert)
      if (editValue === globalValue) {
        const result = await setSettingOverride(
          view.id,
          setting.key,
          null,
          setting.valueType as any,
          setting.group,
          setting.unit
        );
        if (result.success) {
          toast.success("Setting override reverted to global");
          router.refresh();
        } else {
          toast.error(result.error || "Failed to revert override");
        }
      } else {
        const result = await setSettingOverride(
          view.id,
          setting.key,
          editValue,
          setting.valueType as any,
          setting.group,
          setting.unit
        );
        if (result.success) {
          toast.success("Setting override updated");
          router.refresh();
        } else {
          toast.error(result.error || "Failed to update override");
        }
      }
      setEditingSetting(null);
      setEditValue("");
    });
  };

  const handleSettingReset = (setting: {
    key: string;
    value: string;
    valueType: string;
    group: string;
    unit: string | null;
  }) => {
    startTransition(async () => {
      const result = await setSettingOverride(
        view.id,
        setting.key,
        null,
        setting.valueType as any,
        setting.group,
        setting.unit
      );
      if (result.success) {
        toast.success("Setting override reverted to global");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to revert override");
      }
    });
  };

  const formatSettingValue = (key: string, value: string, metadata: SettingMetadata | undefined): string => {
    if (metadata?.inputType === "percent") {
      const num = Number.parseFloat(value);
      return isNaN(num) ? value : formatPercent(num, "decimal");
    } else if (metadata?.inputType === "money") {
      const num = Number.parseFloat(value);
      return isNaN(num) ? value : formatMoney(num, "EGP");
    } else if (metadata?.inputType === "number") {
      const num = Number.parseFloat(value);
      return isNaN(num) ? value : formatNumber(num);
    }
    return value;
  };

  // Group settings by group
  const settingsByGroup = new Map<string, typeof settings>();
  settings.forEach((setting) => {
    const group = setting.group || "Other";
    if (!settingsByGroup.has(group)) {
      settingsByGroup.set(group, []);
    }
    settingsByGroup.get(group)!.push(setting);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/views")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{view.name}</h1>
          <p className="text-muted-foreground mt-1">
            Override active status for employees and overhead types, and override settings values
          </p>
        </div>
      </div>

      {/* Employees Card */}
      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Tech Stack</TableHead>
                  <TableHead>Base Status</TableHead>
                  <TableHead>Effective Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => {
                  const override = employeeOverrides.get(emp.id) || null;
                  const effective = computeEffectiveEmployeeActive(emp.isActive, override);
                  return (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{emp.category}</Badge>
                      </TableCell>
                      <TableCell>{emp.techStack?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={emp.isActive ? "default" : "secondary"}>
                          {emp.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={effective.isActive}
                            onCheckedChange={() => handleEmployeeToggle(emp.id, effective.isActive)}
                            disabled={isPending}
                          />
                          {effective.isOverridden && (
                            <Badge variant="outline" className="text-xs">
                              Overridden
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Overhead Types Card */}
      <Card>
        <CardHeader>
          <CardTitle>Overhead Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Amount (EGP)</TableHead>
                  <TableHead>Base Status</TableHead>
                  <TableHead>Effective Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overheadTypes.map((type) => {
                  const override = overheadTypeOverrides.get(type.id) || null;
                  const effective = computeEffectiveOverheadTypeActive(type.isActive, override);
                  return (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(type.amount, "EGP")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={type.isActive ? "default" : "secondary"}>
                          {type.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={effective.isActive}
                            onCheckedChange={() => handleOverheadTypeToggle(type.id, effective.isActive)}
                            disabled={isPending}
                          />
                          {effective.isOverridden && (
                            <Badge variant="outline" className="text-xs">
                              Overridden
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Settings Overrides Card */}
      <Card>
        <CardHeader>
          <CardTitle>Settings Overrides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Array.from(settingsByGroup.entries()).map(([group, groupSettings]) => (
              <div key={group}>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">{group}</h3>
                <div className="space-y-4">
                  {groupSettings.map((setting) => {
                    const override = settingOverrides.get(setting.key);
                    const isOverridden = override !== undefined;
                    const effectiveValue = effectiveSettings[setting.key];
                    const metadata = SETTINGS_METADATA[setting.key];
                    const isEditing = editingSetting === setting.key;

                    return (
                      <div key={setting.key} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <Label className="text-sm font-medium">
                            {metadata?.label || setting.key}
                          </Label>
                          {metadata?.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {metadata.description}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            {isEditing ? (
                              <>
                                <Input
                                  type={metadata?.inputType === "number" || metadata?.inputType === "percent" || metadata?.inputType === "money" ? "number" : "text"}
                                  step={metadata?.inputType === "percent" ? "0.01" : undefined}
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-32"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSettingSave(setting);
                                    } else if (e.key === "Escape") {
                                      setEditingSetting(null);
                                      setEditValue("");
                                    }
                                  }}
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSettingSave(setting)}
                                  disabled={isPending}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingSetting(null);
                                    setEditValue("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="text-sm text-muted-foreground">
                                  Global: {formatSettingValue(setting.key, setting.value, metadata)}
                                </span>
                                {isOverridden && (
                                  <>
                                    <span className="text-sm">→</span>
                                    <span className="text-sm font-medium">
                                      Override: {formatSettingValue(setting.key, override.value, metadata)}
                                    </span>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOverridden && (
                            <Badge variant="outline" className="text-xs">
                              Overridden
                            </Badge>
                          )}
                          {!isEditing && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSettingEdit(setting)}
                                disabled={isPending}
                              >
                                Override
                              </Button>
                              {isOverridden && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSettingReset(setting)}
                                  disabled={isPending}
                                >
                                  Reset
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Allocation Overrides Card */}
      <Card>
        <CardHeader>
          <CardTitle>Allocation Overrides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  {overheadTypes
                    .filter((type) => {
                      const overheadTypeOverride = overheadTypeOverrides.get(type.id);
                      const effectiveOverheadTypeActive = overheadTypeOverride
                        ? overheadTypeOverride.isActive
                        : type.isActive;
                      return effectiveOverheadTypeActive;
                    })
                    .map((type) => {
                      return (
                        <TableHead key={type.id} className="text-right min-w-[200px]">
                          <div className="flex flex-col gap-2">
                            <div className="font-medium">{type.name}</div>
                            <div className="flex flex-col gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => {
                                  startTransition(async () => {
                                    const result = await allocateEquallyForView(view.id, type.id);
                                    if (result.success) {
                                      toast.success("Allocated equally successfully");
                                      router.refresh();
                                    } else {
                                      toast.error(result.error || "Failed to allocate equally");
                                    }
                                  });
                                }}
                                disabled={isPending}
                              >
                                Allocate Equally
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => {
                                  startTransition(async () => {
                                    const result = await allocateProportionalToGrossForView(view.id, type.id);
                                    if (result.success) {
                                      toast.success("Allocated proportional to gross successfully");
                                      router.refresh();
                                    } else {
                                      toast.error(result.error || "Failed to allocate proportional to gross");
                                    }
                                  });
                                }}
                                disabled={isPending}
                              >
                                Proportional to Gross
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => {
                                  startTransition(async () => {
                                    const result = await normalizeTo100PercentForView(view.id, type.id);
                                    if (result.success) {
                                      toast.success("Normalized to 100% successfully");
                                      router.refresh();
                                    } else {
                                      toast.error(result.error || "Failed to normalize");
                                    }
                                  });
                                }}
                                disabled={isPending}
                              >
                                Normalize
                              </Button>
                            </div>
                          </div>
                        </TableHead>
                      );
                    })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => {
                  const hasOverride = Array.from(allocationOverrides.keys()).some(
                    (key) => key.startsWith(`${emp.id}:`)
                  );
                  return (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {emp.name}
                          {hasOverride && (
                            <Badge variant="outline" className="text-xs">
                              Overridden
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {overheadTypes
                        .filter((type) => {
                          const overheadTypeOverride = overheadTypeOverrides.get(type.id);
                          const effectiveOverheadTypeActive = overheadTypeOverride
                            ? overheadTypeOverride.isActive
                            : type.isActive;
                          return effectiveOverheadTypeActive;
                        })
                        .map((type) => {
                          const baseAlloc = baseAllocations.find(
                            (a) => a.employeeId === emp.id && a.overheadTypeId === type.id
                          );
                          const overrideKey = `${emp.id}:${type.id}`;
                          const override = allocationOverrides.get(overrideKey);

                          return (
                            <TableCell key={type.id} className="text-right">
                              <AllocationCell
                                viewId={view.id}
                                employeeId={emp.id}
                                overheadTypeId={type.id}
                                baseShare={baseAlloc?.share}
                                overrideShare={override?.share}
                              />
                            </TableCell>
                          );
                        })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

