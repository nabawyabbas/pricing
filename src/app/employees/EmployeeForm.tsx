"use client";

import { useState } from "react";

interface EmployeeFormProps {
  techStacks: { id: string; name: string }[];
  action: (formData: FormData) => Promise<void>;
}

export function EmployeeForm({ techStacks, action }: EmployeeFormProps) {
  const [category, setCategory] = useState("");

  return (
    <form
      action={action}
      style={{
        marginBottom: "2rem",
        padding: "1.5rem",
        border: "1px solid #ddd",
        borderRadius: "8px",
        backgroundColor: "#f9f9f9",
      }}
    >
      <h2 style={{ marginBottom: "1rem" }}>Create New Employee</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <label
            htmlFor="name"
            style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
          >
            Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            style={{
              width: "100%",
              padding: "0.5rem",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </div>
        <div>
          <label
            htmlFor="category"
            style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
          >
            Category *
          </label>
          <select
            id="category"
            name="category"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          >
            <option value="">Select category</option>
            <option value="DEV">DEV</option>
            <option value="QA">QA</option>
            <option value="BA">BA</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label
          htmlFor="techStackId"
          style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
        >
          Tech Stack {category === "DEV" && <span style={{ color: "#dc3545" }}>*</span>}
        </label>
        <select
          id="techStackId"
          name="techStackId"
          required={category === "DEV"}
          style={{
            width: "100%",
            padding: "0.5rem",
            fontSize: "1rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        >
          <option value="">None (optional for QA/BA)</option>
          {techStacks.map((stack) => (
            <option key={stack.id} value={stack.id}>
              {stack.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <label
            htmlFor="grossMonthly"
            style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
          >
            Gross Monthly *
          </label>
          <input
            type="number"
            id="grossMonthly"
            name="grossMonthly"
            step="0.01"
            required
            style={{
              width: "100%",
              padding: "0.5rem",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </div>
        <div>
          <label
            htmlFor="netMonthly"
            style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
          >
            Net Monthly *
          </label>
          <input
            type="number"
            id="netMonthly"
            name="netMonthly"
            step="0.01"
            required
            style={{
              width: "100%",
              padding: "0.5rem",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <label
            htmlFor="oncostRate"
            style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
          >
            Oncost Rate (0-1)
          </label>
          <input
            type="number"
            id="oncostRate"
            name="oncostRate"
            step="0.01"
            min="0"
            max="1"
            style={{
              width: "100%",
              padding: "0.5rem",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </div>
        <div>
          <label
            htmlFor="annualBenefits"
            style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
          >
            Annual Benefits
          </label>
          <input
            type="number"
            id="annualBenefits"
            name="annualBenefits"
            step="0.01"
            style={{
              width: "100%",
              padding: "0.5rem",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </div>
        <div>
          <label
            htmlFor="annualBonus"
            style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
          >
            Annual Bonus
          </label>
          <input
            type="number"
            id="annualBonus"
            name="annualBonus"
            step="0.01"
            style={{
              width: "100%",
              padding: "0.5rem",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <label
            htmlFor="fte"
            style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
          >
            FTE (Full-Time Equivalent, default: 1.0)
          </label>
          <input
            type="number"
            id="fte"
            name="fte"
            step="0.1"
            min="0"
            max="1"
            defaultValue="1.0"
            style={{
              width: "100%",
              padding: "0.5rem",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <label
            htmlFor="isActive"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}
          >
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              defaultChecked
              style={{
                width: "1.2rem",
                height: "1.2rem",
                cursor: "pointer",
              }}
            />
            <span style={{ fontWeight: "500" }}>Active (default: true)</span>
          </label>
        </div>
      </div>

      <button
        type="submit"
        style={{
          padding: "0.5rem 1.5rem",
          fontSize: "1rem",
          backgroundColor: "#0070f3",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontWeight: "500",
        }}
      >
        Create
      </button>
    </form>
  );
}

