"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  calculateFullyLoadedMonthly,
  getExchangeRatio,
  type Employee,
  type OverheadType,
  type Settings,
} from "@/lib/pricing";
import {
  updateEmployee,
  toggleEmployeeActive,
  deleteEmployee,
} from "./actions";
import { useTransition } from "react";
import { formatMoney, formatNumber, type Currency } from "@/lib/format";
import { toast } from "sonner";

interface EmployeeTableProps {
  employees: Array<{
    id: string;
    name: string;
    category: string;
    techStackId: string | null;
    techStack: { id: string; name: string } | null;
    grossMonthly: any;
    netMonthly: any;
    oncostRate: number | null;
    annualBenefits: any | null;
    annualBonus: any | null;
    fte: number;
    isActive: boolean;
    overheadAllocs: Array<{
      overheadTypeId: string;
      share: number;
      overheadType: {
        isActive: boolean;
      };
    }>;
  }>;
  techStacks: Array<{ id: string; name: string }>;
  overheadTypes: OverheadType[];
  settings: Settings;
}


export function EmployeeTable({
  employees,
  techStacks,
  overheadTypes,
  settings,
}: EmployeeTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stackFilter, setStackFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [editingEmployee, setEditingEmployee] = useState<typeof employees[0] | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<typeof employees[0] | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    category: string;
    techStackId: string | null;
  }>({ category: "", techStackId: null });

  const exchangeRatio = getExchangeRatio(settings);
  const currency: Currency = exchangeRatio && exchangeRatio > 0 ? "USD" : "EGP";

  // Convert employees to pricing format
  const pricingEmployees = useMemo(() => {
    const activeOverheadTypeIds = new Set(overheadTypes.map((t) => t.id));

    return employees.map((emp) => {
      const activeAllocs = emp.overheadAllocs.filter((alloc) =>
        activeOverheadTypeIds.has(alloc.overheadTypeId)
      );

      return {
        id: emp.id,
        name: emp.name,
        category: emp.category as "DEV" | "QA" | "BA" | "AGENTIC_AI",
        techStackId: emp.techStackId,
        grossMonthly: Number(emp.grossMonthly),
        netMonthly: Number(emp.netMonthly),
        oncostRate: emp.oncostRate,
        annualBenefits: emp.annualBenefits ? Number(emp.annualBenefits) : null,
        annualBonus: emp.annualBonus ? Number(emp.annualBonus) : null,
        fte: emp.fte,
        overheadAllocs: activeAllocs.map((alloc) => ({
          overheadTypeId: alloc.overheadTypeId,
          share: alloc.share,
        })),
      } as Employee;
    });
  }, [employees, overheadTypes]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Search filter
      if (searchQuery && !emp.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Category filter
      if (categoryFilter !== "all" && emp.category !== categoryFilter) {
        return false;
      }

      // Stack filter (only for DEV)
      if (stackFilter !== "all") {
        if (emp.category !== "DEV" || emp.techStackId !== stackFilter) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === "active" && !emp.isActive) {
        return false;
      }
      if (statusFilter === "inactive" && emp.isActive) {
        return false;
      }

      return true;
    });
  }, [employees, searchQuery, categoryFilter, stackFilter, statusFilter]);

  // Calculate costs for filtered employees
  const employeeCosts = useMemo(() => {
    const costs = new Map<string, number>();
    filteredEmployees.forEach((emp) => {
      const pricingEmp = pricingEmployees.find((e) => e.id === emp.id);
      if (pricingEmp) {
        const cost = calculateFullyLoadedMonthly(pricingEmp, overheadTypes, exchangeRatio);
        costs.set(emp.id, cost);
      }
    });
    return costs;
  }, [filteredEmployees, pricingEmployees, overheadTypes, exchangeRatio]);

  // Summary calculations (active only)
  const activeEmployees = employees.filter((e) => e.isActive);
  const activePricingEmployees = pricingEmployees.filter((e) =>
    activeEmployees.some((ae) => ae.id === e.id)
  );
  const totalActiveMonthlyCost = activePricingEmployees.reduce((sum, emp) => {
    return sum + calculateFullyLoadedMonthly(emp, overheadTypes, exchangeRatio);
  }, 0);

  const activeCounts = {
    DEV: activeEmployees.filter((e) => e.category === "DEV").length,
    QA: activeEmployees.filter((e) => e.category === "QA").length,
    BA: activeEmployees.filter((e) => e.category === "BA").length,
    AGENTIC_AI: activeEmployees.filter((e) => e.category === "AGENTIC_AI").length,
  };

  async function handleToggleActive(employee: typeof employees[0], newIsActive: boolean) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", employee.id);
      formData.set("isActive", newIsActive.toString());
      const result = await toggleEmployeeActive(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Employee "${employee.name}" ${newIsActive ? "activated" : "deactivated"}`
        );
        router.refresh();
      }
    });
  }

  async function handleDelete() {
    if (!deletingEmployee) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", deletingEmployee.id);
      const result = await deleteEmployee(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`Employee "${deletingEmployee.name}" deleted successfully`);
        setIsDeleteDialogOpen(false);
        setDeletingEmployee(null);
        router.refresh();
      }
    });
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingEmployee) return;

    startTransition(async () => {
      const formData = new FormData(e.currentTarget);
      formData.set("id", editingEmployee.id);
      formData.set("category", editFormData.category || editingEmployee.category);
      if ((editFormData.category === "DEV" || editFormData.category === "AGENTIC_AI") && editFormData.techStackId) {
        formData.set("techStackId", editFormData.techStackId);
      } else if (editFormData.category !== "DEV" && editFormData.category !== "AGENTIC_AI") {
        formData.set("techStackId", "");
      }
      const result = await updateEmployee(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`Employee "${editingEmployee.name}" updated successfully`);
        setIsEditDialogOpen(false);
        setEditingEmployee(null);
        setEditFormData({ category: "", techStackId: null });
        router.refresh();
      }
    });
  }

  function handleEditDialogOpen(employee: typeof employees[0]) {
    setEditingEmployee(employee);
    setEditFormData({
      category: employee.category,
      techStackId: employee.techStackId,
    });
    setIsEditDialogOpen(true);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Employees</CardTitle>
            <div className="text-sm text-muted-foreground">
              {filteredEmployees.length} of {employees.length} employee{employees.length !== 1 ? 's' : ''}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="DEV">DEV</SelectItem>
                  <SelectItem value="QA">QA</SelectItem>
                  <SelectItem value="BA">BA</SelectItem>
                  <SelectItem value="AGENTIC_AI">Agentic AI</SelectItem>
                </SelectContent>
              </Select>
              <Select value={stackFilter} onValueChange={setStackFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Tech Stack" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stacks</SelectItem>
                  {techStacks.map((stack) => (
                    <SelectItem key={stack.id} value={stack.id}>
                      {stack.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Tech Stack</TableHead>
                <TableHead className="text-right">Gross Monthly</TableHead>
                <TableHead className="text-right">Net Monthly</TableHead>
                <TableHead className="text-right">FTE</TableHead>
                <TableHead className="text-right">Monthly Cost ({currency})</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No employees found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee) => {
                  const cost = employeeCosts.get(employee.id) || 0;
                  return (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.category}</TableCell>
                      <TableCell>{employee.techStack?.name || "-"}</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(Number(employee.grossMonthly), "EGP")}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(Number(employee.netMonthly), "EGP")}
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(employee.fte, 2)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(cost, currency)}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={employee.isActive}
                          onCheckedChange={(checked) => handleToggleActive(employee, checked)}
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
                              onClick={() => handleEditDialogOpen(employee)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(employee, !employee.isActive)}
                              disabled={isPending}
                            >
                              {employee.isActive ? (
                                <>
                                  <ToggleLeft className="mr-2 h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <ToggleRight className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setDeletingEmployee(employee);
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
                })
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="font-medium">
                  Summary (Active Only)
                </TableCell>
                <TableCell colSpan={3} className="text-right">
                  DEV: {activeCounts.DEV} | QA: {activeCounts.QA} | BA: {activeCounts.BA} | Agentic AI: {activeCounts.AGENTIC_AI}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatMoney(totalActiveMonthlyCost, currency)}
                </TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update employee information</DialogDescription>
          </DialogHeader>
          {editingEmployee && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={editingEmployee.name}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-category">Category *</Label>
                  <Select
                    value={editFormData.category || editingEmployee.category}
                    onValueChange={(value) =>
                      setEditFormData({
                        ...editFormData,
                        category: value,
                        techStackId: (value === "DEV" || value === "AGENTIC_AI") ? editFormData.techStackId : null,
                      })
                    }
                  >
                    <SelectTrigger id="edit-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEV">DEV</SelectItem>
                      <SelectItem value="QA">QA</SelectItem>
                      <SelectItem value="BA">BA</SelectItem>
                      <SelectItem value="AGENTIC_AI">Agentic AI</SelectItem>
                    </SelectContent>
                  </Select>
                  <input
                    type="hidden"
                    name="category"
                    value={editFormData.category || editingEmployee.category}
                  />
                </div>
                {((editFormData.category === "DEV" || editingEmployee.category === "DEV") ||
                  (editFormData.category === "AGENTIC_AI" || editingEmployee.category === "AGENTIC_AI")) && (
                  <div>
                    <Label htmlFor="edit-techStackId">Tech Stack *</Label>
                    <Select
                      value={editFormData.techStackId || editingEmployee.techStackId || ""}
                      onValueChange={(value) =>
                        setEditFormData({ ...editFormData, techStackId: value })
                      }
                      required
                    >
                      <SelectTrigger id="edit-techStackId">
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
                    <input
                      type="hidden"
                      name="techStackId"
                      value={editFormData.techStackId || editingEmployee.techStackId || ""}
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="edit-fte">FTE</Label>
                  <Input
                    id="edit-fte"
                    name="fte"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editingEmployee.fte}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-grossMonthly">Gross Monthly (EGP) *</Label>
                  <Input
                    id="edit-grossMonthly"
                    name="grossMonthly"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={Number(editingEmployee.grossMonthly)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-netMonthly">Net Monthly (EGP) *</Label>
                  <Input
                    id="edit-netMonthly"
                    name="netMonthly"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={Number(editingEmployee.netMonthly)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-oncostRate">Oncost Rate</Label>
                  <Input
                    id="edit-oncostRate"
                    name="oncostRate"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editingEmployee.oncostRate || ""}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-annualBenefits">Annual Benefits ({currency})</Label>
                  <Input
                    id="edit-annualBenefits"
                    name="annualBenefits"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editingEmployee.annualBenefits ? Number(editingEmployee.annualBenefits) : ""}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-annualBonus">Annual Bonus ({currency})</Label>
                  <Input
                    id="edit-annualBonus"
                    name="annualBonus"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editingEmployee.annualBonus ? Number(editingEmployee.annualBonus) : ""}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-isActive"
                    name="isActive"
                    defaultChecked={editingEmployee.isActive}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="edit-isActive">Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingEmployee(null);
                  }}
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
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingEmployee?.name}"? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingEmployee(null);
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
