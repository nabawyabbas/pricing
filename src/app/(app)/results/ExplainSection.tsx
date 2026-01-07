"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import {
  calculateAnnualBase,
  calculateAllocatedOverhead,
  calculateFullyLoadedMonthly,
  getExchangeRatio,
  type Employee,
  type OverheadType,
  type Settings,
} from "@/lib/pricing";
import { formatMoney, formatPercent, formatNumber, formatNumberLocale, type Currency } from "@/lib/format";

interface ExplainSectionProps {
  stackName: string;
  stackId: string;
  result: {
    devCostPerRelHour: number | null;
    qaCostPerDevRelHour: number;
    baCostPerDevRelHour: number;
    releaseableCost: number | null;
    finalPrice: number | null;
  };
  employees: Employee[];
  overheadTypes: OverheadType[];
  settings: Settings;
  qaCostPerDevRelHour: number;
  baCostPerDevRelHour: number;
  currency: Currency;
}

export function ExplainSection({
  stackName,
  stackId,
  result,
  employees,
  overheadTypes,
  settings,
  qaCostPerDevRelHour,
  baCostPerDevRelHour,
  currency,
}: ExplainSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const devEmployees = employees.filter(
    (emp) => emp.category === "DEV" && emp.techStackId === stackId
  );
  const qaEmployees = employees.filter((emp) => emp.category === "QA");
  const baEmployees = employees.filter((emp) => emp.category === "BA");

  // Get settings with defaults
  const devReleasableHoursPerMonth = settings.dev_releasable_hours_per_month ?? 100;
  const standardHoursPerMonth = settings.standard_hours_per_month ?? 160;
  const qaRatio = settings.qa_ratio ?? 0.5;
  const baRatio = settings.ba_ratio ?? 0.25;
  const margin = settings.margin ?? 0.2;
  const risk = settings.risk ?? 0.1;
  const exchangeRatio = getExchangeRatio(settings);

  // Calculate intermediate values for DEV employees
  const devCalculations = devEmployees.map((emp) => {
    const annualBase = calculateAnnualBase(emp, exchangeRatio);
    const allocatedOverhead = calculateAllocatedOverhead(emp, overheadTypes, exchangeRatio);
    const fullyLoadedAnnual = annualBase + allocatedOverhead;
    const fullyLoadedMonthly = calculateFullyLoadedMonthly(emp, overheadTypes, exchangeRatio);
    return {
      employee: emp,
      annualBase,
      allocatedOverhead,
      fullyLoadedAnnual,
      fullyLoadedMonthly,
    };
  });

  const devMonthlyCost = devCalculations.reduce(
    (sum, calc) => sum + calc.fullyLoadedMonthly,
    0
  );
  const totalDevFte = devEmployees.reduce((sum, emp) => sum + emp.fte, 0);
  const devHoursCapacity = devReleasableHoursPerMonth * totalDevFte;

  // Calculate QA intermediate values
  const qaCalculations = qaEmployees.map((emp) => {
    const annualBase = calculateAnnualBase(emp, exchangeRatio);
    const allocatedOverhead = calculateAllocatedOverhead(emp, overheadTypes, exchangeRatio);
    const fullyLoadedAnnual = annualBase + allocatedOverhead;
    const fullyLoadedMonthly = calculateFullyLoadedMonthly(emp, overheadTypes, exchangeRatio);
    return {
      employee: emp,
      annualBase,
      allocatedOverhead,
      fullyLoadedAnnual,
      fullyLoadedMonthly,
    };
  });

  const qaMonthlyCost = qaCalculations.reduce(
    (sum, calc) => sum + calc.fullyLoadedMonthly,
    0
  );
  const qaCostPerQaHour = qaMonthlyCost / standardHoursPerMonth;

  // Calculate BA intermediate values
  const baCalculations = baEmployees.map((emp) => {
    const annualBase = calculateAnnualBase(emp, exchangeRatio);
    const allocatedOverhead = calculateAllocatedOverhead(emp, overheadTypes, exchangeRatio);
    const fullyLoadedAnnual = annualBase + allocatedOverhead;
    const fullyLoadedMonthly = calculateFullyLoadedMonthly(emp, overheadTypes, exchangeRatio);
    return {
      employee: emp,
      annualBase,
      allocatedOverhead,
      fullyLoadedAnnual,
      fullyLoadedMonthly,
    };
  });

  const baMonthlyCost = baCalculations.reduce(
    (sum, calc) => sum + calc.fullyLoadedMonthly,
    0
  );
  const baCostPerBaHour = baMonthlyCost / standardHoursPerMonth;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4">
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-primary hover:underline">
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Explain
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4">
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div>
              <h4 className="font-semibold mb-3 text-muted-foreground">Calculation Breakdown ({currency})</h4>

              {/* DEV Calculations */}
              <div className="mb-6">
                <h5 className="font-medium mb-3 text-muted-foreground">DEV Team ({stackName})</h5>
                {devCalculations.length === 0 ? (
                  <p className="text-muted-foreground italic">No DEV employees</p>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Monthly Cost:</strong> {formatMoney(devMonthlyCost, currency)}
                    </div>
                    <div>
                      <strong>Total FTE:</strong> {formatNumber(totalDevFte, 2)}
                    </div>
                    <div>
                      <strong>Hours Capacity:</strong> {formatNumberLocale(devHoursCapacity, 0)} hours/month
                      <span className="text-muted-foreground ml-2">
                        ({devReleasableHoursPerMonth} × {formatNumber(totalDevFte, 2)})
                      </span>
                    </div>
                    <div>
                      <strong>Cost per Releaseable Hour:</strong> {formatMoney(result.devCostPerRelHour ?? 0, currency)}
                      <span className="text-muted-foreground ml-2">
                        ({formatMoney(devMonthlyCost, currency)} ÷ {formatNumberLocale(devHoursCapacity, 0)})
                      </span>
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-primary text-xs">
                        Show employee details
                      </summary>
                      <div className="mt-2 pl-4 space-y-2">
                        {devCalculations.map((calc) => (
                          <div
                            key={calc.employee.id}
                            className="p-2 bg-muted rounded text-xs"
                          >
                            <strong>{calc.employee.name}</strong>
                            <div className="mt-1 text-muted-foreground">
                              Annual Base: {formatMoney(calc.annualBase, currency)} | Allocated Overhead:{" "}
                              {formatMoney(calc.allocatedOverhead, currency)} | Fully Loaded Monthly:{" "}
                              {formatMoney(calc.fullyLoadedMonthly, currency)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>

              {/* QA Calculations */}
              <div className="mb-6">
                <h5 className="font-medium mb-3 text-muted-foreground">QA Team</h5>
                {qaCalculations.length === 0 ? (
                  <p className="text-muted-foreground italic">No QA employees</p>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Monthly Cost:</strong> {formatMoney(qaMonthlyCost, currency)}
                    </div>
                    <div>
                      <strong>Cost per QA Hour:</strong> {formatMoney(qaCostPerQaHour, currency)}
                      <span className="text-muted-foreground ml-2">
                        ({formatMoney(qaMonthlyCost, currency)} ÷ {standardHoursPerMonth})
                      </span>
                    </div>
                    <div>
                      <strong>QA Ratio:</strong> {formatPercent(qaRatio, "decimal")}
                    </div>
                    <div>
                      <strong>Cost per Dev Releaseable Hour:</strong> {formatMoney(qaCostPerDevRelHour, currency)}
                      <span className="text-muted-foreground ml-2">
                        ({formatMoney(qaCostPerQaHour, currency)} × {qaRatio})
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* BA Calculations */}
              <div className="mb-6">
                <h5 className="font-medium mb-3 text-muted-foreground">BA Team</h5>
                {baCalculations.length === 0 ? (
                  <p className="text-muted-foreground italic">No BA employees</p>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Monthly Cost:</strong> {formatMoney(baMonthlyCost, currency)}
                    </div>
                    <div>
                      <strong>Cost per BA Hour:</strong> {formatMoney(baCostPerBaHour, currency)}
                      <span className="text-muted-foreground ml-2">
                        ({formatMoney(baMonthlyCost, currency)} ÷ {standardHoursPerMonth})
                      </span>
                    </div>
                    <div>
                      <strong>BA Ratio:</strong> {formatPercent(baRatio, "decimal")}
                    </div>
                    <div>
                      <strong>Cost per Dev Releaseable Hour:</strong> {formatMoney(baCostPerDevRelHour, currency)}
                      <span className="text-muted-foreground ml-2">
                        ({formatMoney(baCostPerBaHour, currency)} × {baRatio})
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Final Calculations */}
              <div className="p-3 bg-muted rounded">
                <h5 className="font-medium mb-3 text-muted-foreground">Final Price Calculation</h5>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Releaseable Cost:</strong> {formatMoney(result.releaseableCost ?? 0, currency)}
                    <span className="text-muted-foreground ml-2">
                      (DEV: {formatMoney(result.devCostPerRelHour ?? 0, currency)} + QA:{" "}
                      {formatMoney(qaCostPerDevRelHour, currency)} + BA: {formatMoney(baCostPerDevRelHour, currency)})
                    </span>
                  </div>
                  <div>
                    <strong>Margin:</strong> {formatPercent(margin, "decimal")} | <strong>Risk:</strong> {formatPercent(risk, "decimal")}
                  </div>
                  <div>
                    <strong>Final Price:</strong> {formatMoney(result.finalPrice ?? 0, currency)}
                    <span className="text-muted-foreground ml-2">
                      ({formatMoney(result.releaseableCost ?? 0, currency)} × 1.{formatNumber(margin * 100, 0)} × 1.{formatNumber(risk * 100, 0)})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
