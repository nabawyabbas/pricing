"use client";

import { useState } from "react";
import { updateOverheadType, deleteOverheadType, allocateEqually, allocateProportionalToGross, normalizeTo100Percent } from "./actions";
import { Prisma } from "@prisma/client";

interface OverheadTypeRowProps {
  overheadType: {
    id: string;
    name: string;
    amount: Prisma.Decimal;
    period: string;
    _count: { allocations: number };
  };
  totalShare: number;
}

export function OverheadTypeRow({ overheadType, totalShare }: OverheadTypeRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(overheadType.name);
  const [amount, setAmount] = useState(Number(overheadType.amount).toString());
  const [period, setPeriod] = useState(overheadType.period);
  const [isDeleting, setIsDeleting] = useState(false);

  const convertToAnnual = (amt: number, per: string): number => {
    switch (per) {
      case "annual":
        return amt;
      case "monthly":
        return amt * 12;
      case "quarterly":
        return amt * 4;
      default:
        return amt;
    }
  };

  const annualEquivalent = convertToAnnual(Number(overheadType.amount), overheadType.period);
  const isWarning = Math.abs(totalShare - 1) > 0.01;

  async function handleUpdate(formData: FormData) {
    await updateOverheadType(formData);
    setIsEditing(false);
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete "${overheadType.name}"? This will also delete all allocations.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteOverheadType(overheadType.id);
    } catch (error) {
      alert("Failed to delete overhead type");
      setIsDeleting(false);
    }
  }

  async function handleAllocateEqually() {
    await allocateEqually(overheadType.id);
  }

  async function handleAllocateProportional() {
    await allocateProportionalToGross(overheadType.id);
  }

  async function handleNormalize() {
    await normalizeTo100Percent(overheadType.id);
  }

  if (isEditing) {
    return (
      <tr>
        <td colSpan={6} style={{ padding: "0.75rem", borderBottom: "1px solid #ddd" }}>
          <form action={handleUpdate} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "0.5rem", alignItems: "center" }}>
            <input type="hidden" name="id" value={overheadType.id} />
            <input
              type="text"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                padding: "0.5rem",
                fontSize: "0.9rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
            <input
              type="number"
              name="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0"
              required
              style={{
                padding: "0.5rem",
                fontSize: "0.9rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
            <select
              name="period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              required
              style={{
                padding: "0.5rem",
                fontSize: "0.9rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            >
              <option value="annual">Annual</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="submit"
                style={{
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.85rem",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setName(overheadType.name);
                  setAmount(Number(overheadType.amount).toString());
                  setPeriod(overheadType.period);
                }}
                style={{
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.85rem",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr>
        <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd" }}>{overheadType.name}</td>
        <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd", textAlign: "right" }}>
          ${Number(overheadType.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd" }}>
          <span
            style={{
              padding: "0.2rem 0.6rem",
              borderRadius: "4px",
              fontSize: "0.85rem",
              backgroundColor: "#e3f2fd",
              color: "#1976d2",
            }}
          >
            {overheadType.period}
          </span>
        </td>
        <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd", textAlign: "right" }}>
          ${annualEquivalent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd", textAlign: "center" }}>
          {overheadType._count.allocations}
        </td>
        <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd", textAlign: "center" }}>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                padding: "0.25rem 0.5rem",
                fontSize: "0.85rem",
                backgroundColor: "#0070f3",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              style={{
                padding: "0.25rem 0.5rem",
                fontSize: "0.85rem",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: isDeleting ? "not-allowed" : "pointer",
                opacity: isDeleting ? 0.6 : 1,
              }}
            >
              {isDeleting ? "..." : "Delete"}
            </button>
          </div>
        </td>
      </tr>
      {isWarning && (
        <tr>
          <td colSpan={6} style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #ddd", backgroundColor: "#fff3cd" }}>
            <div style={{ color: "#856404", fontSize: "0.9rem" }}>
              <strong>Warning:</strong> Allocations for "{overheadType.name}" sum to {(totalShare * 100).toFixed(2)}% (should be 100%)
            </div>
          </td>
        </tr>
      )}
      <tr>
        <td colSpan={6} style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #ddd", backgroundColor: "#f8f9fa" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <form action={handleAllocateEqually} style={{ display: "inline" }}>
              <button
                type="submit"
                style={{
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.85rem",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Allocate Equally
              </button>
            </form>
            <form action={handleAllocateProportional} style={{ display: "inline" }}>
              <button
                type="submit"
                style={{
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.85rem",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Allocate Proportional to Gross
              </button>
            </form>
            <form action={handleNormalize} style={{ display: "inline" }}>
              <button
                type="submit"
                style={{
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.85rem",
                  backgroundColor: "#ffc107",
                  color: "#000",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Normalize to 100%
              </button>
            </form>
          </div>
        </td>
      </tr>
    </>
  );
}

