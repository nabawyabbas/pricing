"use client";

import { useState } from "react";
import { Download } from "lucide-react";
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
import { getExchangeRatio, type Settings } from "@/lib/pricing";
import { formatMoney, type Currency } from "@/lib/format";

interface ResultsTableProps {
  stackResults: Array<{
    stack: { id: string; name: string };
    category: "DEV" | "AGENTIC_AI";
    result: {
      devCostPerRelHour: number | null;
      qaCostPerDevRelHour: number;
      baCostPerDevRelHour: number;
      releaseableCost: number | null;
      finalPrice: number | null;
    };
  }>;
  qaCostPerDevRelHour: number;
  baCostPerDevRelHour: number;
  settings: Settings;
  currency: Currency;
}

export function ResultsTable({
  stackResults,
  qaCostPerDevRelHour,
  baCostPerDevRelHour,
  settings,
  currency,
}: ResultsTableProps) {
  const [isExporting, setIsExporting] = useState(false);

  function exportToCSV() {
    setIsExporting(true);
    const exchangeRatio = getExchangeRatio(settings);
    const currencyLabel = currency;

    // CSV Headers
    const headers = [
      "Tech Stack",
      "Category",
      "Cost per Releaseable Hour",
      "QA Cost per Dev Releaseable Hour",
      "BA Cost per Dev Releaseable Hour",
      "Releaseable Cost",
      "Final Price",
    ];

    // CSV Rows
    const rows = stackResults.map(({ stack, category, result }) => [
      stack.name,
      category === "DEV" ? "DEV" : "Agentic AI",
      result.devCostPerRelHour !== null ? result.devCostPerRelHour.toString() : "N/A",
      category === "DEV" ? qaCostPerDevRelHour.toString() : "0 (excluded)",
      category === "DEV" ? baCostPerDevRelHour.toString() : "0 (excluded)",
      result.releaseableCost !== null ? result.releaseableCost.toString() : "N/A",
      result.finalPrice !== null ? result.finalPrice.toString() : "N/A",
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `pricing-results-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExporting(false);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Results Summary</CardTitle>
          <Button onClick={exportToCSV} disabled={isExporting} size="sm">
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10">Tech Stack</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">QA Add-on</TableHead>
                <TableHead className="text-right">BA Add-on</TableHead>
                <TableHead className="text-right">Releaseable Cost</TableHead>
                <TableHead className="text-right">Final Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stackResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No tech stacks found with active DEV or AGENTIC_AI employees.
                  </TableCell>
                </TableRow>
              ) : (
                stackResults.map(({ stack, category, result }) => (
                  <TableRow key={`${stack.id}-${category}`}>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium">
                      {stack.name}
                    </TableCell>
                    <TableCell>
                      {category === "DEV" ? "DEV" : "Agentic AI"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(result.devCostPerRelHour, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {category === "DEV" ? (
                        formatMoney(qaCostPerDevRelHour, currency)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {category === "DEV" ? (
                        formatMoney(baCostPerDevRelHour, currency)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(result.releaseableCost, currency)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatMoney(result.finalPrice, currency)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
