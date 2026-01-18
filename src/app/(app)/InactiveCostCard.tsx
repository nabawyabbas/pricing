"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { getInactiveEmployeesForCard, type InactiveEmployeeRow } from "./actions";

interface InactiveCostCardProps {
  totalInactiveMonthlyCost: number;
  currency: "EGP" | "USD";
  viewId: string | null | undefined;
}

export function InactiveCostCard({
  totalInactiveMonthlyCost,
  currency,
  viewId,
}: InactiveCostCardProps) {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<InactiveEmployeeRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Close dialog and clear stale rows when viewId changes
  useEffect(() => {
    setOpen(false);
    setEmployees([]);
  }, [viewId]);

  // Fetch employees when dialog opens or viewId changes
  useEffect(() => {
    if (open) {
      setLoading(true);
      getInactiveEmployeesForCard(viewId)
        .then((data) => {
          setEmployees(data);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Failed to load inactive employees:", error);
          setLoading(false);
        });
    }
  }, [open, viewId]);

  return (
    <Dialog key={viewId ?? "base"} open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="w-full h-auto p-0 hover:bg-transparent"
        >
          <Card className="border-yellow-200 bg-yellow-50 hover:bg-yellow-100 transition-colors cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-yellow-800">
                Inactive Monthly Cost ({currency})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-900">
                {formatMoney(totalInactiveMonthlyCost, currency)}
              </div>
              <div className="text-xs text-yellow-700 mt-1">
                Excluded from calculations
              </div>
            </CardContent>
          </Card>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inactive Employees</DialogTitle>
          <DialogDescription>
            Employees excluded from calculations ({employees.length} total)
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading...
          </div>
        ) : employees.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No inactive employees found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Name</TableHead>
                <TableHead className="text-right">Gross Salary (USD)</TableHead>
                <TableHead className="text-right">Hiring Since</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell className="text-right">
                    {formatMoney(emp.grossUsd, "USD")}
                  </TableCell>
                  <TableCell className="text-right">{emp.tenureText}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}

