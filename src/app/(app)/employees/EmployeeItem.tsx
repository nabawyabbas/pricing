"use client";

import { useState } from "react";
import { toggleEmployeeActive, deleteEmployee } from "./actions";
import { DeleteButton } from "./DeleteButton";
import { Prisma } from "@prisma/client";

interface EmployeeItemProps {
  employee: {
    id: string;
    name: string;
    category: string;
    techStackId: string | null;
    techStack: { name: string } | null;
    grossMonthly: Prisma.Decimal;
    netMonthly: Prisma.Decimal;
    oncostRate: number | null;
    annualBenefits: Prisma.Decimal | null;
    annualBonus: Prisma.Decimal | null;
    fte: number;
    isActive: boolean;
  };
  techStacks: { id: string; name: string }[];
}

function formatDecimal(value: Prisma.Decimal | null): string {
  return value ? value.toString() : "";
}

export function EmployeeItem({ employee, techStacks }: EmployeeItemProps) {
  const [isActive, setIsActive] = useState(employee.isActive);
  const [isToggling, setIsToggling] = useState(false);

  async function handleToggleActive() {
    setIsToggling(true);
    const formData = new FormData();
    formData.set("id", employee.id);
    formData.set("isActive", (!isActive).toString());
    await toggleEmployeeActive(formData);
    setIsActive(!isActive);
    setIsToggling(false);
  }

  return (
    <div
      style={{
        padding: "1rem",
        border: "1px solid #ddd",
        borderRadius: "4px",
        backgroundColor: isActive ? "white" : "#f8f9fa",
        opacity: isActive ? 1 : 0.7,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap" }}>
            <strong style={{ fontSize: "1.1rem" }}>{employee.name}</strong>
            <span
              style={{
                padding: "0.2rem 0.6rem",
                borderRadius: "4px",
                fontSize: "0.85rem",
                backgroundColor: employee.category === "DEV" ? "#e3f2fd" : employee.category === "QA" ? "#f3e5f5" : "#fff3e0",
                color: employee.category === "DEV" ? "#1976d2" : employee.category === "QA" ? "#7b1fa2" : "#e65100",
              }}
            >
              {employee.category}
            </span>
            {employee.techStack && (
              <span style={{ fontSize: "0.9rem", color: "#666" }}>
                Stack: {employee.techStack.name}
              </span>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={handleToggleActive}
                disabled={isToggling}
                style={{
                  width: "1rem",
                  height: "1rem",
                  cursor: isToggling ? "not-allowed" : "pointer",
                }}
              />
              <span style={{ fontSize: "0.85rem", color: isActive ? "#28a745" : "#dc3545", fontWeight: "500" }}>
                {isActive ? "Active" : "Inactive"}
              </span>
            </label>
          </div>
          <div style={{ fontSize: "0.9rem", color: "#666", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.5rem" }}>
            <div>Gross: ${formatDecimal(employee.grossMonthly)}</div>
            <div>Net: ${formatDecimal(employee.netMonthly)}</div>
            {employee.oncostRate !== null && <div>Oncost: {(employee.oncostRate * 100).toFixed(1)}%</div>}
            {employee.annualBenefits !== null && <div>Benefits: ${formatDecimal(employee.annualBenefits)}</div>}
            {employee.annualBonus !== null && <div>Bonus: ${formatDecimal(employee.annualBonus)}</div>}
            <div>FTE: {employee.fte}</div>
          </div>
        </div>
        <DeleteButton id={employee.id} name={employee.name} />
      </div>
    </div>
  );
}

