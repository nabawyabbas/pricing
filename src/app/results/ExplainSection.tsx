"use client";

import { useState } from "react";
import {
  calculateAnnualBase,
  calculateAllocatedOverhead,
  calculateFullyLoadedMonthly,
  type Employee,
  type OverheadPool,
  type Assumptions,
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
  overheadPool: OverheadPool;
  assumptions: Assumptions;
  qaCostPerDevRelHour: number;
  baCostPerDevRelHour: number;
}

export function ExplainSection({
  stackName,
  stackId,
  result,
  employees,
  overheadPool,
  assumptions,
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
    const annualBase = calculateAnnualBase(emp);
    const allocatedOverhead = calculateAllocatedOverhead(emp, overheadPool);
    const fullyLoadedAnnual = annualBase + allocatedOverhead;
    const fullyLoadedMonthly = calculateFullyLoadedMonthly(emp, overheadPool);
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
  const devHoursCapacity = assumptions.devReleasableHoursPerMonth * totalDevFte;

  // Calculate QA intermediate values
  const qaCalculations = qaEmployees.map((emp) => {
    const annualBase = calculateAnnualBase(emp);
    const allocatedOverhead = calculateAllocatedOverhead(emp, overheadPool);
    const fullyLoadedAnnual = annualBase + allocatedOverhead;
    const fullyLoadedMonthly = calculateFullyLoadedMonthly(emp, overheadPool);
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
  const qaCostPerQaHour = qaMonthlyCost / assumptions.standardHoursPerMonth;

  // Calculate BA intermediate values
  const baCalculations = baEmployees.map((emp) => {
    const annualBase = calculateAnnualBase(emp);
    const allocatedOverhead = calculateAllocatedOverhead(emp, overheadPool);
    const fullyLoadedAnnual = annualBase + allocatedOverhead;
    const fullyLoadedMonthly = calculateFullyLoadedMonthly(emp, overheadPool);
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
  const baCostPerBaHour = baMonthlyCost / assumptions.standardHoursPerMonth;

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
        <h4 style={{ margin: 0 }}>Calculation Breakdown</h4>
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
              <strong>Monthly Cost:</strong> {formatCurrency(devMonthlyCost)}
            </div>
            <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <strong>Total FTE:</strong> {totalDevFte.toFixed(2)}
            </div>
            <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <strong>Hours Capacity:</strong> {devHoursCapacity.toFixed(0)} hours/month
              <span style={{ color: "#666", marginLeft: "0.5rem" }}>
                ({assumptions.devReleasableHoursPerMonth} × {totalDevFte.toFixed(2)})
              </span>
            </div>
            <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <strong>Cost per Releaseable Hour:</strong> {formatCurrency(result.devCostPerRelHour ?? 0)}
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
                      Annual Base: {formatCurrency(calc.annualBase)} | Allocated Overhead:{" "}
                      {formatCurrency(calc.allocatedOverhead)} | Fully Loaded Monthly:{" "}
                      {formatCurrency(calc.fullyLoadedMonthly)}
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
              <strong>Monthly Cost:</strong> {formatCurrency(qaMonthlyCost)}
            </div>
            <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <strong>Cost per QA Hour:</strong> {formatCurrency(qaCostPerQaHour)}
              <span style={{ color: "#666", marginLeft: "0.5rem" }}>
                ({formatCurrency(qaMonthlyCost)} ÷ {assumptions.standardHoursPerMonth})
              </span>
            </div>
            <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <strong>QA Ratio:</strong> {assumptions.qaRatio} ({assumptions.qaRatio * 100}%)
            </div>
            <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <strong>Cost per Dev Releaseable Hour:</strong> {formatCurrency(qaCostPerDevRelHour)}
              <span style={{ color: "#666", marginLeft: "0.5rem" }}>
                ({formatCurrency(qaCostPerQaHour)} × {assumptions.qaRatio})
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
              <strong>Monthly Cost:</strong> {formatCurrency(baMonthlyCost)}
            </div>
            <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <strong>Cost per BA Hour:</strong> {formatCurrency(baCostPerBaHour)}
              <span style={{ color: "#666", marginLeft: "0.5rem" }}>
                ({formatCurrency(baMonthlyCost)} ÷ {assumptions.standardHoursPerMonth})
              </span>
            </div>
            <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <strong>BA Ratio:</strong> {assumptions.baRatio} ({assumptions.baRatio * 100}%)
            </div>
            <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <strong>Cost per Dev Releaseable Hour:</strong> {formatCurrency(baCostPerDevRelHour)}
              <span style={{ color: "#666", marginLeft: "0.5rem" }}>
                ({formatCurrency(baCostPerBaHour)} × {assumptions.baRatio})
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
            <strong>Releaseable Cost:</strong> {formatCurrency(result.releaseableCost ?? 0)}
            <span style={{ color: "#666", marginLeft: "0.5rem" }}>
              (DEV: {formatCurrency(result.devCostPerRelHour ?? 0)} + QA:{" "}
              {formatCurrency(qaCostPerDevRelHour)} + BA: {formatCurrency(baCostPerDevRelHour)})
            </span>
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            <strong>Margin:</strong> {assumptions.margin * 100}% | <strong>Risk:</strong>{" "}
            {assumptions.risk * 100}%
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            <strong>Final Price:</strong> {formatCurrency(result.finalPrice ?? 0)}
            <span style={{ color: "#666", marginLeft: "0.5rem" }}>
              ({formatCurrency(result.releaseableCost ?? 0)} × 1.{assumptions.margin * 100} × 1.
              {assumptions.risk * 100})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

