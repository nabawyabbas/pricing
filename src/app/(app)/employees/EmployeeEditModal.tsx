"use client";

import { useState, useEffect } from "react";
import { updateEmployee } from "./actions";
import { Prisma } from "@prisma/client";

interface EmployeeEditModalProps {
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
  techStacks: Array<{ id: string; name: string }>;
  onClose: () => void;
}

export function EmployeeEditModal({ employee, techStacks, onClose }: EmployeeEditModalProps) {
  const [name, setName] = useState(employee.name);
  const [category, setCategory] = useState(employee.category);
  const [techStackId, setTechStackId] = useState(employee.techStackId || "");
  const [grossMonthly, setGrossMonthly] = useState(Number(employee.grossMonthly).toString());
  const [netMonthly, setNetMonthly] = useState(Number(employee.netMonthly).toString());
  const [oncostRate, setOncostRate] = useState(employee.oncostRate?.toString() || "");
  const [annualBenefits, setAnnualBenefits] = useState(employee.annualBenefits ? Number(employee.annualBenefits).toString() : "");
  const [annualBonus, setAnnualBonus] = useState(employee.annualBonus ? Number(employee.annualBonus).toString() : "");
  const [fte, setFte] = useState(employee.fte.toString());
  const [isActive, setIsActive] = useState(employee.isActive);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set("id", employee.id);
    formData.set("name", name);
    formData.set("category", category);
    formData.set("techStackId", category === "DEV" ? techStackId : "");
    formData.set("grossMonthly", grossMonthly);
    formData.set("netMonthly", netMonthly);
    formData.set("oncostRate", oncostRate || "");
    formData.set("annualBenefits", annualBenefits || "");
    formData.set("annualBonus", annualBonus || "");
    formData.set("fte", fte);
    formData.set("isActive", isActive.toString());

    await updateEmployee(formData);
    setIsSubmitting(false);
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "2rem",
          maxWidth: "600px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: "1.5rem", fontSize: "1.5rem" }}>Edit Employee</h2>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label htmlFor="edit-name" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Name *
              </label>
              <input
                type="text"
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
              <label htmlFor="edit-category" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Category *
              </label>
              <select
                id="edit-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  fontSize: "1rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              >
                <option value="DEV">DEV</option>
                <option value="QA">QA</option>
                <option value="BA">BA</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="edit-techStack" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
              Tech Stack {category === "DEV" && <span style={{ color: "#dc3545" }}>*</span>}
            </label>
            <select
              id="edit-techStack"
              value={techStackId}
              onChange={(e) => setTechStackId(e.target.value)}
              required={category === "DEV"}
              disabled={category !== "DEV"}
              style={{
                width: "100%",
                padding: "0.5rem",
                fontSize: "1rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                backgroundColor: category !== "DEV" ? "#f5f5f5" : "white",
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
              <label htmlFor="edit-grossMonthly" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Gross Monthly *
              </label>
              <input
                type="number"
                id="edit-grossMonthly"
                step="0.01"
                value={grossMonthly}
                onChange={(e) => setGrossMonthly(e.target.value)}
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
              <label htmlFor="edit-netMonthly" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Net Monthly *
              </label>
              <input
                type="number"
                id="edit-netMonthly"
                step="0.01"
                value={netMonthly}
                onChange={(e) => setNetMonthly(e.target.value)}
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
              <label htmlFor="edit-oncostRate" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Oncost Rate (0-1)
              </label>
              <input
                type="number"
                id="edit-oncostRate"
                step="0.01"
                min="0"
                max="1"
                value={oncostRate}
                onChange={(e) => setOncostRate(e.target.value)}
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
              <label htmlFor="edit-annualBenefits" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Annual Benefits
              </label>
              <input
                type="number"
                id="edit-annualBenefits"
                step="0.01"
                value={annualBenefits}
                onChange={(e) => setAnnualBenefits(e.target.value)}
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
              <label htmlFor="edit-annualBonus" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Annual Bonus
              </label>
              <input
                type="number"
                id="edit-annualBonus"
                step="0.01"
                value={annualBonus}
                onChange={(e) => setAnnualBonus(e.target.value)}
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
              <label htmlFor="edit-fte" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                FTE (Full-Time Equivalent)
              </label>
              <input
                type="number"
                id="edit-fte"
                step="0.1"
                min="0"
                max="1"
                value={fte}
                onChange={(e) => setFte(e.target.value)}
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
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{
                    width: "1.2rem",
                    height: "1.2rem",
                    cursor: "pointer",
                  }}
                />
                <span style={{ fontWeight: "500" }}>Active</span>
              </label>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.5rem 1.5rem",
                fontSize: "1rem",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "0.5rem 1.5rem",
                fontSize: "1rem",
                backgroundColor: "#0070f3",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                fontWeight: "500",
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

