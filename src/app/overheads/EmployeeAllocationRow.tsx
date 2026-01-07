"use client";

import { useState, useRef } from "react";
import { updateOverheadAllocation } from "./actions";
import { Prisma } from "@prisma/client";

interface EmployeeAllocationRowProps {
  employee: {
    id: string;
    name: string;
    category: string;
    techStack: { name: string } | null;
    grossMonthly: Prisma.Decimal;
    overheadAlloc: { mgmtShare: number; companyShare: number } | null;
  };
}

export function EmployeeAllocationRow({ employee }: EmployeeAllocationRowProps) {
  const [mgmtShare, setMgmtShare] = useState(
    (employee.overheadAlloc?.mgmtShare ?? 0).toString()
  );
  const [companyShare, setCompanyShare] = useState(
    (employee.overheadAlloc?.companyShare ?? 0).toString()
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const submitForm = () => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  const handleChange = (field: "mgmt" | "company", value: string) => {
    if (field === "mgmt") {
      setMgmtShare(value);
    } else {
      setCompanyShare(value);
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout to submit after user stops typing
    timeoutRef.current = setTimeout(() => {
      submitForm();
    }, 1000);
  };

  const handleBlur = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    submitForm();
  };

  async function handleSubmit(formData: FormData) {
    // Get current values from state, not form data
    formData.set("mgmtShare", mgmtShare);
    formData.set("companyShare", companyShare);
    await updateOverheadAllocation(formData);
  }

  const totalShare = (Number.parseFloat(mgmtShare) || 0) + (Number.parseFloat(companyShare) || 0);

  return (
    <tr>
      <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd" }}>{employee.name}</td>
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
      <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd" }}>
        ${Number(employee.grossMonthly).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </td>
      <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd" }}>
        <form ref={formRef} action={handleSubmit} style={{ display: "inline" }}>
          <input type="hidden" name="employeeId" value={employee.id} />
          <input
            type="number"
            name="mgmtShare"
            step="0.0001"
            min="0"
            max="1"
            value={mgmtShare}
            onChange={(e) => handleChange("mgmt", e.target.value)}
            onBlur={handleBlur}
            style={{
              width: "80px",
              padding: "0.25rem",
              fontSize: "0.9rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              textAlign: "center",
            }}
            placeholder="0.0000"
          />
        </form>
      </td>
      <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd" }}>
        <form ref={formRef} action={handleSubmit} style={{ display: "inline" }}>
          <input type="hidden" name="employeeId" value={employee.id} />
          <input
            type="number"
            name="companyShare"
            step="0.0001"
            min="0"
            max="1"
            value={companyShare}
            onChange={(e) => handleChange("company", e.target.value)}
            onBlur={handleBlur}
            style={{
              width: "80px",
              padding: "0.25rem",
              fontSize: "0.9rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              textAlign: "center",
            }}
            placeholder="0.0000"
          />
        </form>
      </td>
      <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd", textAlign: "center" }}>
        <span style={{ fontSize: "0.85rem", color: "#666" }}>
          {(totalShare * 100).toFixed(2)}%
        </span>
      </td>
    </tr>
  );
}

