"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatPercent, formatPct, type Currency } from "@/lib/format";
import { getOverheadAllocationSum, isAllocationValid } from "@/lib/dashboard";
import { calculateFinalPrice, type Employee, type OverheadType, type Settings, type Breakdown } from "@/lib/pricing";
import { BreakdownDialog } from "./BreakdownDialog";
import { ClickableCell } from "./ClickableCell";

interface ResultsTablesProps {
  techStacks: Array<{ id: string; name: string }>;
  devByStack: Map<string, Employee[]>;
  agenticAiByStack: Map<string, Employee[]>;
  activeOverheadTypes: OverheadType[];
  pricingEmployees: Employee[];
  settings: Settings;
  currency: Currency;
  devBreakdowns: Map<string, Map<string, Breakdown>>; // stackId -> metricKey -> Breakdown
  agenticBreakdowns: Map<string, Map<string, Breakdown>>; // stackId -> metricKey -> Breakdown
  qaAddOnTotal: number;
  baAddOnTotal: number;
  qaAddOnBreakdown: Breakdown | null;
  baAddOnBreakdown: Breakdown | null;
}

export function ResultsTables({
  techStacks,
  devByStack,
  agenticAiByStack,
  activeOverheadTypes,
  pricingEmployees,
  settings,
  currency,
  devBreakdowns,
  agenticBreakdowns,
  qaAddOnTotal,
  baAddOnTotal,
  qaAddOnBreakdown,
  baAddOnBreakdown,
}: ResultsTablesProps) {
  const [selectedBreakdown, setSelectedBreakdown] = useState<Breakdown | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openBreakdown = (breakdown: Breakdown | null) => {
    setSelectedBreakdown(breakdown);
    setDialogOpen(true);
  };

  return (
    <>
      <BreakdownDialog
        breakdown={selectedBreakdown}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      {/* DEV Pricing Table */}
      <Card>
        <CardHeader>
          <CardTitle>DEV Pricing (per releaseable hour)</CardTitle>
        </CardHeader>
        <CardContent>
          {activeOverheadTypes.length === 0 ? (
            <p className="text-muted-foreground italic">No active overhead types found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10">Stack</TableHead>
                    <TableHead className="text-right">Raw Cost/hr</TableHead>
                    {activeOverheadTypes.map((type) => {
                      const allocationSum = getOverheadAllocationSum(type.id, pricingEmployees);
                      const isValid = isAllocationValid(allocationSum);
                      return (
                        <TableHead key={type.id} className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-medium">{type.name}</span>
                            {!isValid && (
                              <span className="text-xs text-destructive">
                                ⚠️ {formatPercent(allocationSum, "decimal")}
                              </span>
                            )}
                          </div>
                        </TableHead>
                      );
                    })}
                    <TableHead className="text-right font-semibold">Total Overheads/hr</TableHead>
                    <TableHead className="text-right font-semibold">QA Add-on/hr</TableHead>
                    <TableHead className="text-right font-semibold">BA Add-on/hr</TableHead>
                    <TableHead className="text-right font-semibold">Total Releaseable Cost/hr</TableHead>
                    <TableHead className="text-right font-semibold">Final Price/hr</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {techStacks.map((stack) => {
                    const stackDevs = devByStack.get(stack.id) || [];
                    const stackBreakdowns = devBreakdowns.get(stack.id) || new Map();

                    if (stackDevs.length === 0) {
                      return null;
                    }

                    const rawCost = stackBreakdowns.get("dev_raw_hr")?.result ?? null;
                    const overheads = activeOverheadTypes.map(
                      (type) => stackBreakdowns.get(`dev_overhead_hr:${type.id}`)?.result ?? null
                    );
                    const totalOverheads = stackBreakdowns.get("total_overheads_hr")?.result ?? null;
                    const totalReleaseableCost = stackBreakdowns.get("total_releaseable_cost_hr")?.result ?? null;
                    const finalPrice = stackBreakdowns.get("final_price_hr")?.result ?? null;

                    const calculatePct = (component: number | null): number | null => {
                      if (totalReleaseableCost === null || totalReleaseableCost === 0 || component === null) {
                        return null;
                      }
                      return (component / totalReleaseableCost) * 100;
                    };

                    return (
                      <TableRow key={stack.id}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium">
                          {stack.name}
                        </TableCell>
                        <ClickableCell
                          value={rawCost}
                          currency={currency}
                          percentage={calculatePct(rawCost)}
                          onClick={() => openBreakdown(stackBreakdowns.get("dev_raw_hr") ?? null)}
                        />
                        {overheads.map((overhead, ohIdx) => {
                          const type = activeOverheadTypes[ohIdx];
                          return (
                            <ClickableCell
                              key={type.id}
                              value={overhead}
                              currency={currency}
                              percentage={calculatePct(overhead)}
                              onClick={() =>
                                openBreakdown(stackBreakdowns.get(`dev_overhead_hr:${type.id}`) ?? null)
                              }
                            />
                          );
                        })}
                        <ClickableCell
                          value={totalOverheads}
                          currency={currency}
                          percentage={calculatePct(totalOverheads)}
                          className="font-semibold"
                          onClick={() => openBreakdown(stackBreakdowns.get("total_overheads_hr") ?? null)}
                        />
                        <ClickableCell
                          value={qaAddOnTotal}
                          currency={currency}
                          percentage={calculatePct(qaAddOnTotal)}
                          className="font-semibold"
                          onClick={() => openBreakdown(qaAddOnBreakdown)}
                        />
                        <ClickableCell
                          value={baAddOnTotal}
                          currency={currency}
                          percentage={calculatePct(baAddOnTotal)}
                          className="font-semibold"
                          onClick={() => openBreakdown(baAddOnBreakdown)}
                        />
                        <ClickableCell
                          value={totalReleaseableCost}
                          currency={currency}
                          className="font-semibold"
                          onClick={() => openBreakdown(stackBreakdowns.get("total_releaseable_cost_hr") ?? null)}
                        />
                        <ClickableCell
                          value={finalPrice}
                          currency={currency}
                          className="font-semibold text-primary"
                          onClick={() => openBreakdown(stackBreakdowns.get("final_price_hr") ?? null)}
                        />
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AGENTIC_AI Pricing Table */}
      {agenticAiByStack.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AGENTIC_AI Pricing (per releaseable hour)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10">Stack</TableHead>
                    <TableHead className="text-right">Raw Cost/hr</TableHead>
                    {activeOverheadTypes.map((type) => {
                      const allocationSum = getOverheadAllocationSum(type.id, pricingEmployees);
                      const isValid = isAllocationValid(allocationSum);
                      return (
                        <TableHead key={type.id} className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-medium">{type.name}</span>
                            {!isValid && (
                              <span className="text-xs text-destructive">
                                ⚠️ {formatPercent(allocationSum, "decimal")}
                              </span>
                            )}
                          </div>
                        </TableHead>
                      );
                    })}
                    <TableHead className="text-right font-semibold">Total Overheads/hr</TableHead>
                    <TableHead className="text-right font-semibold">Total Releaseable Cost/hr</TableHead>
                    <TableHead className="text-right font-semibold">Final Price/hr</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {techStacks.map((stack) => {
                    const stackAgenticAi = agenticAiByStack.get(stack.id) || [];
                    const stackBreakdowns = agenticBreakdowns.get(stack.id) || new Map();

                    if (stackAgenticAi.length === 0) {
                      return null;
                    }

                    const rawCost = stackBreakdowns.get("dev_raw_hr")?.result ?? null;
                    const overheads = activeOverheadTypes.map(
                      (type) => stackBreakdowns.get(`dev_overhead_hr:${type.id}`)?.result ?? null
                    );
                    const totalOverheads = stackBreakdowns.get("total_overheads_hr")?.result ?? null;
                    const totalReleaseableCost = stackBreakdowns.get("total_releaseable_cost_hr")?.result ?? null;
                    const finalPrice = stackBreakdowns.get("final_price_hr")?.result ?? null;

                    const calculatePct = (component: number | null): number | null => {
                      if (totalReleaseableCost === null || totalReleaseableCost === 0 || component === null) {
                        return null;
                      }
                      return (component / totalReleaseableCost) * 100;
                    };

                    return (
                      <TableRow key={stack.id}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium">
                          {stack.name}
                        </TableCell>
                        <ClickableCell
                          value={rawCost}
                          currency={currency}
                          percentage={calculatePct(rawCost)}
                          onClick={() => openBreakdown(stackBreakdowns.get("dev_raw_hr") ?? null)}
                        />
                        {overheads.map((overhead, ohIdx) => {
                          const type = activeOverheadTypes[ohIdx];
                          return (
                            <ClickableCell
                              key={type.id}
                              value={overhead}
                              currency={currency}
                              percentage={calculatePct(overhead)}
                              onClick={() =>
                                openBreakdown(stackBreakdowns.get(`dev_overhead_hr:${type.id}`) ?? null)
                              }
                            />
                          );
                        })}
                        <ClickableCell
                          value={totalOverheads}
                          currency={currency}
                          percentage={calculatePct(totalOverheads)}
                          className="font-semibold"
                          onClick={() => openBreakdown(stackBreakdowns.get("total_overheads_hr") ?? null)}
                        />
                        <ClickableCell
                          value={totalReleaseableCost}
                          currency={currency}
                          className="font-semibold"
                          onClick={() => openBreakdown(stackBreakdowns.get("total_releaseable_cost_hr") ?? null)}
                        />
                        <ClickableCell
                          value={finalPrice}
                          currency={currency}
                          className="font-semibold text-primary"
                          onClick={() => openBreakdown(stackBreakdowns.get("final_price_hr") ?? null)}
                        />
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

