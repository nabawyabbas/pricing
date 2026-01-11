"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  createOverheadType,
  updateOverheadType,
  deleteOverheadType,
  toggleOverheadTypeActive,
} from "./actions";
import { toast } from "sonner";
import { formatMoney, formatPercent } from "@/lib/format";
import { type Settings, getExchangeRatio } from "@/lib/pricing";

interface OverheadTypesListProps {
  overheadTypes: Array<{
    id: string;
    name: string;
    amount: number;
    period: string;
    isActive: boolean;
    _count: { allocations: number };
  }>;
  totalsByType: Map<string, number>;
  missingAllocationsByType: Map<string, number>;
  settings: Settings;
}

function convertToAnnual(amount: number, period: string): number {
  switch (period) {
    case "annual":
      return amount;
    case "monthly":
      return amount * 12;
    case "quarterly":
      return amount * 4;
    default:
      return amount;
  }
}

export function OverheadTypesList({
  overheadTypes,
  totalsByType,
  missingAllocationsByType,
  settings,
}: OverheadTypesListProps) {
  const exchangeRatio = getExchangeRatio(settings);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showInactive, setShowInactive] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<typeof overheadTypes[0] | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingType, setDeletingType] = useState<typeof overheadTypes[0] | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const activeTypes = overheadTypes.filter((t) => t.isActive);
  const inactiveTypes = overheadTypes.filter((t) => !t.isActive);

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createOverheadType(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Overhead type created successfully");
        setIsCreateDialogOpen(false);
        router.refresh();
      }
    });
  }

  async function handleUpdate(formData: FormData) {
    if (!editingType) return;

    startTransition(async () => {
      const result = await updateOverheadType(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`Overhead type "${editingType.name}" updated successfully`);
        setIsEditDialogOpen(false);
        setEditingType(null);
        router.refresh();
      }
    });
  }

  async function handleDelete() {
    if (!deletingType) return;

    startTransition(async () => {
      const result = await deleteOverheadType(deletingType.id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`Overhead type "${deletingType.name}" deleted successfully`);
        setIsDeleteDialogOpen(false);
        setDeletingType(null);
        router.refresh();
      }
    });
  }

  async function handleToggleActiveSwitch(type: typeof overheadTypes[0], checked: boolean) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", type.id);
      formData.set("isActive", checked.toString());
      const result = await toggleOverheadTypeActive(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Overhead type "${type.name}" ${checked ? "activated" : "deactivated"}`
        );
        router.refresh();
      }
    });
  }

  async function handleToggleActive(type: typeof overheadTypes[0]) {
    handleToggleActiveSwitch(type, !type.isActive);
  }

  const displayTypes = showInactive ? overheadTypes : activeTypes;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Overhead Types</CardTitle>
            <div className="flex items-center gap-4">
              {inactiveTypes.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-inactive"
                    checked={showInactive}
                    onCheckedChange={(checked) => setShowInactive(checked === true)}
                  />
                  <Label htmlFor="show-inactive" className="text-sm cursor-pointer">
                    Show Inactive ({inactiveTypes.length})
                  </Label>
                </div>
              )}
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Overhead Type</DialogTitle>
                    <DialogDescription>
                      Add a new overhead type to allocate costs
                    </DialogDescription>
                  </DialogHeader>
                  <form action={handleCreate} className="space-y-4">
                    <div>
                      <Label htmlFor="create-name">Name *</Label>
                      <Input id="create-name" name="name" required disabled={isPending} />
                    </div>
                    <div>
                      <Label htmlFor="create-amount">Amount *</Label>
                      <Input
                        id="create-amount"
                        name="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        disabled={isPending}
                      />
                    </div>
                    <div>
                      <Label htmlFor="create-period">Period *</Label>
                      <Select name="period" required disabled={isPending}>
                        <SelectTrigger id="create-period">
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="annual">Annual</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="create-isActive"
                        name="isActive"
                        defaultChecked
                        disabled={isPending}
                      />
                      <Label htmlFor="create-isActive" className="cursor-pointer">
                        Active
                      </Label>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                        disabled={isPending}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isPending}>
                        {isPending ? "Creating..." : "Create"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {displayTypes.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No overhead types found. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Amount (USD)</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Annual Equivalent (USD)</TableHead>
                  <TableHead className="text-center">Allocation Sum</TableHead>
                  <TableHead className="text-center">Missing</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayTypes.map((type) => {
                  const totalShare = totalsByType.get(type.id) ?? 0;
                  const missingCount = missingAllocationsByType.get(type.id) ?? 0;
                  const isWarning = Math.abs(totalShare - 1) > 0.01;
                  // Convert from EGP to USD using exchange ratio
                  const amountInEGP = Number(type.amount);
                  const amountInUSD = exchangeRatio && exchangeRatio > 0 
                    ? amountInEGP / exchangeRatio 
                    : amountInEGP;
                  const annualEquivalent = convertToAnnual(amountInUSD, type.period);

                  return (
                    <TableRow
                      key={type.id}
                      className={!type.isActive ? "opacity-60" : ""}
                    >
                      <TableCell className="font-medium">
                        {type.name}
                        {!type.isActive && (
                          <span className="text-muted-foreground text-sm ml-2">(Inactive)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(amountInUSD, "USD")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{type.period}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(annualEquivalent, "USD")}
                      </TableCell>
                      <TableCell className="text-center">
                        <div>
                          <span
                            className={
                              isWarning ? "text-destructive font-medium" : "text-green-600 font-medium"
                            }
                          >
                            {formatPercent(totalShare, "decimal")}
                          </span>
                          {isWarning && (
                            <div className="text-xs text-yellow-600 mt-1">⚠️ Not 100%</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {missingCount > 0 ? (
                          <span className="text-destructive font-medium">{missingCount}</span>
                        ) : (
                          <span className="text-green-600">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={type.isActive}
                          onCheckedChange={(checked) => handleToggleActiveSwitch(type, checked)}
                          disabled={isPending}
                        />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingType(type);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(type)}
                              disabled={isPending}
                            >
                              {type.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setDeletingType(type);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Overhead Type</DialogTitle>
            <DialogDescription>Update overhead type information</DialogDescription>
          </DialogHeader>
          {editingType && (
            <form action={handleUpdate} className="space-y-4">
              <input type="hidden" name="id" value={editingType.id} />
              <div>
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={editingType.name}
                  required
                  disabled={isPending}
                />
              </div>
              <div>
                <Label htmlFor="edit-amount">Amount *</Label>
                <Input
                  id="edit-amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={Number(editingType.amount)}
                  required
                  disabled={isPending}
                />
              </div>
              <div>
                <Label htmlFor="edit-period">Period *</Label>
                <Select name="period" defaultValue={editingType.period} required disabled={isPending}>
                  <SelectTrigger id="edit-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-isActive"
                  name="isActive"
                  defaultChecked={editingType.isActive}
                  disabled={isPending}
                />
                <Label htmlFor="edit-isActive" className="cursor-pointer">
                  Active
                </Label>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingType(null);
                  }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Overhead Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingType?.name}"? This will also delete all
              allocations. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingType(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
