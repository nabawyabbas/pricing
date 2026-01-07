"use client";

import { useState, useRef } from "react";
import { updateOverheadAllocation } from "./actions";
import { Prisma } from "@prisma/client";

interface AllocationGridProps {
  employees: Array<{
    id: string;
    name: string;
    category: string;
    techStack: { name: string } | null;
    grossMonthly: Prisma.Decimal;
    overheadAllocs: Array<{
      id: string;
      overheadTypeId: string;
      share: number;
      overheadType: { name: string };
    }>;
  }>;
  overheadTypes: Array<{
    id: string;
    name: string;
  }>;
  totalsByType: Map<string, number>;
}

export function AllocationGrid({ employees, overheadTypes, totalsByType }: AllocationGridProps) {
  const [editingCells, setEditingCells] = useState<Map<string, string>>(new Map());
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

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
    return (getShare(employeeId, overheadTypeId) * 100).toFixed(2);
  };

  const handleChange = (employeeId: string, overheadTypeId: string, value: string) => {
    const key = `${employeeId}-${overheadTypeId}`;
    setEditingCells(new Map(editingCells.set(key, value)));

    // Clear existing timeout
    const existingTimeout = timeoutRefs.current.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout to submit after user stops typing
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
    const share = numValue / 100; // Convert percentage to decimal

    const formData = new FormData();
    formData.set("employeeId", employeeId);
    formData.set("overheadTypeId", overheadTypeId);
    formData.set("share", share.toString());
    await updateOverheadAllocation(formData);
  }

  const getTotalForEmployee = (employeeId: string): number => {
    return overheadTypes.reduce((sum, type) => sum + getShare(employeeId, type.id), 0);
  };

  return (
    <div>
      {/* Warnings per overhead type */}
      {overheadTypes.map((type) => {
        const total = totalsByType.get(type.id) ?? 0;
        const isWarning = Math.abs(total - 1) > 0.01;
        if (!isWarning) return null;
        return (
          <div
            key={type.id}
            style={{
              marginBottom: "1rem",
              padding: "1rem",
              backgroundColor: "#fff3cd",
              border: "1px solid #ffc107",
              borderRadius: "4px",
              color: "#856404",
            }}
          >
            <strong>Warning:</strong> Allocations for "{type.name}" sum to {(total * 100).toFixed(2)}% (should be 100%)
          </div>
        );
      })}

      {/* Allocation Grid Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            backgroundColor: "white",
            border: "1px solid #ddd",
            borderRadius: "4px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f8f9fa" }}>
              <th
                style={{
                  padding: "0.75rem",
                  textAlign: "left",
                  borderBottom: "2px solid #ddd",
                  position: "sticky",
                  left: 0,
                  backgroundColor: "#f8f9fa",
                  zIndex: 1,
                }}
              >
                Employee
              </th>
              <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>Category</th>
              <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>Tech Stack</th>
              <th style={{ padding: "0.75rem", textAlign: "right", borderBottom: "2px solid #ddd" }}>Gross Monthly</th>
              {overheadTypes.map((type) => (
                <th key={type.id} style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd", minWidth: "120px" }}>
                  {type.name} (%)
                </th>
              ))}
              <th style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd" }}>Total %</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => {
              const employeeTotal = getTotalForEmployee(employee.id);
              return (
                <tr key={employee.id}>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid #ddd",
                      position: "sticky",
                      left: 0,
                      backgroundColor: "white",
                      zIndex: 1,
                    }}
                  >
                    {employee.name}
                  </td>
                  <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd" }}>
                    <span
                      style={{
                        padding: "0.2rem 0.6rem",
                        borderRadius: "4px",
                        fontSize: "0.85rem",
                        backgroundColor:
                          employee.category === "DEV"
                            ? "#e3f2fd"
                            : employee.category === "QA"
                            ? "#f3e5f5"
                            : "#fff3e0",
                        color:
                          employee.category === "DEV"
                            ? "#1976d2"
                            : employee.category === "QA"
                            ? "#7b1fa2"
                            : "#e65100",
                      }}
                    >
                      {employee.category}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd" }}>
                    {employee.techStack?.name || "-"}
                  </td>
                  <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd", textAlign: "right" }}>
                    ${Number(employee.grossMonthly).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  {overheadTypes.map((type) => {
                    const share = getShare(employee.id, type.id);
                    const displayValue = getEditingValue(employee.id, type.id);
                    return (
                      <td key={type.id} style={{ padding: "0.75rem", borderBottom: "1px solid #ddd", textAlign: "center" }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={displayValue}
                          onChange={(e) => handleChange(employee.id, type.id, e.target.value)}
                          onBlur={() => handleBlur(employee.id, type.id)}
                          style={{
                            width: "80px",
                            padding: "0.25rem",
                            fontSize: "0.9rem",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            textAlign: "center",
                          }}
                          placeholder="0.00"
                        />
                      </td>
                    );
                  })}
                  <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd", textAlign: "center" }}>
                    <span style={{ fontSize: "0.85rem", color: "#666" }}>
                      {(employeeTotal * 100).toFixed(2)}%
                    </span>
                  </td>
                </tr>
              );
            })}
            {/* Totals row */}
            <tr style={{ backgroundColor: "#f8f9fa", fontWeight: "bold" }}>
              <td colSpan={4} style={{ padding: "0.75rem", textAlign: "right" }}>
                Totals:
              </td>
              {overheadTypes.map((type) => {
                const total = totalsByType.get(type.id) ?? 0;
                const isWarning = Math.abs(total - 1) > 0.01;
                return (
                  <td
                    key={type.id}
                    style={{
                      padding: "0.75rem",
                      textAlign: "center",
                      color: isWarning ? "#dc3545" : "#28a745",
                    }}
                  >
                    {(total * 100).toFixed(2)}%
                  </td>
                );
              })}
              <td style={{ padding: "0.75rem" }}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

