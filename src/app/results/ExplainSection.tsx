"use client";

import { useState } from "react";
import {
  calculateAnnualBase,
  calculateAllocatedOverhead,
  calculateFullyLoadedMonthly,
  type Employee,
  type OverheadType,
  type Settings,
} from "@/lib/pricing";

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
}: ExplainSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const devEmployees = employees.filter(
    (emp) => emp.category === "DEV" && emp.techStackId === stackId
  );
  const qaEmployees = employees.filter((emp) => emp.category === "QA");
  const baEmployees = employees.filter((emp) => emp.category === "BA");

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Get settings with defaults
  const devReleasableHoursPerMonth = settings.dev_releasable_hours_per_month ?? 100;
  const standardHoursPerMonth = settings.standard_hours_per_month ?? 160;
  const qaRatio = settings.qa_ratio ?? 0.5;
  const baRatio = settings.ba_ratio ?? 0.25;
  const margin = settings.margin ?? 0.2;
  const risk = settings.risk ?? 0.1;
  const exchangeRatio = settings.exchange_ratio ?? null;
  const currency = exchangeRatio && exchangeRatio > 0 ? "USD" : "EGP";

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        style={{
          width: "100%",
          padding: "0.75rem",
          backgroundColor: "#f8f9fa",
          border: "1px solid #ddd",
          borderRadius: "4px",
          cursor: "pointer",
          textAlign: "left",
          fontSize: "0.9rem",
          color: "#0070f3",
        }}
      >
        ▶ Explain
      </button>
    );
  }

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
    <div
      style={{
        marginTop: "1rem",
        padding: "1rem",
        backgroundColor: "#f8f9fa",
        border: "1px solid #ddd",
        borderRadius: "4px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h4 style={{ margin: 0 }}>Calculation Breakdown {exchangeRatio && exchangeRatio > 0 && `(in ${currency})`}</h4>
        <button
          onClick={() => setIsExpanded(false)}
          style={{
            padding: "0.25rem 0.5rem",
            backgroundColor: "transparent",
            border: "1px solid #ddd",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          ▼ Collapse
        </button>
      </div>

      {/* DEV Calculations */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h5 style={{ marginBottom: "0.75rem", color: "#666" }}>DEV Team ({stackName})</h5>
        {devCalculations.length === 0 ? (
          <p style={{ color: "#666", fontStyle: "italic" }}>No DEV employees</p>
        ) : (
          <>
            <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <strong>Monthly Cost:</strong> {formatCurrency(devMonthlyCost)} {currency}
            </div>
            <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <strong>Total FTE:</strong> {totalDevFte.toFixed(2)}
            </div>
            <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <strong>Hours Capacity:</strong> {devHoursCapacity.toFixed(0)} hours/month
              <span style={{ color: "#666", marginLeft: "0.5rem" }}>
                ({devReleasableHoursPerMonth} × {totalDevFte.toFixed(2)})
              </span>
            </div>
            <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <strong>Cost per Releaseable Hour:</strong> {formatCurrency(result.devCostPerRelHour ?? 0)} {currency}
              <span style={{ color: "#666", marginLeft: "0.5rem" }}>
                ({formatCurrency(devMonthlyCost)} ÷ {devHoursCapacity.toFixed(0)})
              </span>
            </div>
            <details style={{ marginTop: "0.5rem" }}>
              <summary style={{ cursor: "pointer", color: "#0070f3", fontSize: "0.85rem" }}>
                Show employee details
              </summary>
              <div style={{ marginTop: "0.5rem", paddingLeft: "1rem" }}>
                {devCalculations.map((calc) => (
                  <div
                    key={calc.employee.id}
                    style={{
                      marginBottom: "0.5rem",
                      padding: "0.5rem",
                      backgroundColor: "white",
                      borderRadius: "4px",
                      fontSize: "0.85rem",
                    }}
                  >
                    <strong>{calc.employee.name}</strong>
                    <div style={{ marginTop: "0.25rem", color: "#666" }}>
                      Annual Base: {formatCurrency(calc.annualBase)} {currency} | Allocated Overhead:{" "}
                      {formatCurrency(calc.allocatedOverhead)} {currency} | Fully Loaded Monthly:{" "}
                      {formatCurrency(calc.fullyLoadedMonthly)} {currency}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </>
        )}
      </div>

      {/* QA Calculations */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h5 style={{ marginBottom: "0.75rem", color: "#666" }}>QA Team</h5>
        {qaCalculations.length === 0 ? (
          <p style={{ color: "#666", fontStyle: "italic" }}>No QA employees</p>
        ) : (
          <>
            <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <strong>Monthly Cost:</strong> {formatCurrency(qaMonthlyCost)} {currency}
            </div>
            <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <strong>Cost per QA Hour:</strong> {formatCurrency(qaCostPerQaHour)} {currency}
              <span style={{ color: "#666", marginLeft: "0.5rem" }}>
                ({formatCurrency(qaMonthlyCost)} ÷ {standardHoursPerMonth})
              </span>
            </div>
            <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <strong>QA Ratio:</strong> {qaRatio} ({qaRatio * 100}%)
            </div>
            <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <strong>Cost per Dev Releaseable Hour:</strong> {formatCurrency(qaCostPerDevRelHour)} {currency}
              <span style={{ color: "#666", marginLeft: "0.5rem" }}>
                ({formatCurrency(qaCostPerQaHour)} × {qaRatio})
              </span>
            </div>
          </>
        )}
      </div>

      {/* BA Calculations */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h5 style={{ marginBottom: "0.75rem", color: "#666" }}>BA Team</h5>
        {baCalculations.length === 0 ? (
          <p style={{ color: "#666", fontStyle: "italic" }}>No BA employees</p>
        ) : (
          <>
            <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <strong>Monthly Cost:</strong> {formatCurrency(baMonthlyCost)} {currency}
            </div>
            <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <strong>Cost per BA Hour:</strong> {formatCurrency(baCostPerBaHour)} {currency}
              <span style={{ color: "#666", marginLeft: "0.5rem" }}>
                ({formatCurrency(baMonthlyCost)} ÷ {standardHoursPerMonth})
              </span>
            </div>
            <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <strong>BA Ratio:</strong> {baRatio} ({baRatio * 100}%)
            </div>
            <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <strong>Cost per Dev Releaseable Hour:</strong> {formatCurrency(baCostPerDevRelHour)} {currency}
              <span style={{ color: "#666", marginLeft: "0.5rem" }}>
                ({formatCurrency(baCostPerBaHour)} × {baRatio})
              </span>
            </div>
          </>
        )}
      </div>

      {/* Final Calculations */}
      <div style={{ padding: "0.75rem", backgroundColor: "white", borderRadius: "4px" }}>
        <h5 style={{ marginBottom: "0.75rem", color: "#666" }}>Final Price Calculation</h5>
        <div style={{ fontSize: "0.9rem", lineHeight: "1.6" }}>
          <div>
            <strong>Releaseable Cost:</strong> {formatCurrency(result.releaseableCost ?? 0)} {currency}
            <span style={{ color: "#666", marginLeft: "0.5rem" }}>
              (DEV: {formatCurrency(result.devCostPerRelHour ?? 0)} {currency} + QA:{" "}
              {formatCurrency(qaCostPerDevRelHour)} {currency} + BA: {formatCurrency(baCostPerDevRelHour)} {currency})
            </span>
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            <strong>Margin:</strong> {margin * 100}% | <strong>Risk:</strong>{" "}
            {risk * 100}%
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            <strong>Final Price:</strong> {formatCurrency(result.finalPrice ?? 0)} {currency}
            <span style={{ color: "#666", marginLeft: "0.5rem" }}>
              ({formatCurrency(result.releaseableCost ?? 0)} {currency} × 1.{margin * 100} × 1.
              {risk * 100})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
