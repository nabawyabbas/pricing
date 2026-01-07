import { db } from "@/lib/db";
import {
  createOverheadType,
  updateOverheadType,
  deleteOverheadType,
  allocateEqually,
  allocateProportionalToGross,
  normalizeTo100Percent,
} from "./actions";
import { OverheadTypeRow } from "./OverheadTypeRow";
import { AllocationGrid } from "./AllocationGrid";
import { Prisma } from "@prisma/client";

async function getOverheadTypes() {
  return await db.overheadType.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { allocations: true },
      },
    },
  });
}

async function getEmployees() {
  return await db.employee.findMany({
    include: {
      techStack: true,
      overheadAllocs: {
        include: {
          overheadType: true,
        },
      },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

async function handleCreateType(formData: FormData) {
  "use server";
  await createOverheadType(formData);
}

function formatDecimal(value: Prisma.Decimal | null): string {
  return value ? Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00";
}

function convertToAnnual(amount: number, period: string): number {
  switch (period) {
    case "annual":
      return amount;
    case "monthly":
      return amount * 12;
    case "quarterly":
      return amount * 4;
    default:
      return amount;
  }
}

export default async function OverheadsPage() {
  const overheadTypes = await getOverheadTypes();
  const employees = await getEmployees();

  // Filter to active items for calculations
  const activeOverheadTypes = overheadTypes.filter((t) => t.isActive);
  const activeEmployees = employees.filter((e) => e.isActive);

  // Get active overhead type IDs
  const activeOverheadTypeIds = new Set(activeOverheadTypes.map((t) => t.id));

  // Calculate totals per overhead type (only active employees and active overhead types)
  const totalsByType = new Map<string, number>();
  activeOverheadTypes.forEach((type) => {
    const total = activeEmployees.reduce((sum, emp) => {
      // Only count allocations where both employee and overheadType are active
      const alloc = emp.overheadAllocs.find(
        (a) => a.overheadTypeId === type.id && a.overheadType.isActive
      );
      return sum + (alloc?.share ?? 0);
    }, 0);
    totalsByType.set(type.id, total);
  });

  // Count inactive items for warnings
  const inactiveEmployeeCount = employees.filter((e) => !e.isActive).length;
  const inactiveOverheadCount = overheadTypes.filter((t) => !t.isActive).length;

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ marginBottom: "2rem" }}>Overhead Management</h1>

      {/* Inactive Items Warning */}
      {(inactiveEmployeeCount > 0 || inactiveOverheadCount > 0) && (
        <div
          style={{
            marginBottom: "2rem",
            padding: "1rem",
            border: "1px solid #ffc107",
            borderRadius: "8px",
            backgroundColor: "#fff3cd",
            color: "#856404",
          }}
        >
          <strong>Note:</strong> Excluding from allocation calculations: {inactiveEmployeeCount} inactive employee(s) and {inactiveOverheadCount} inactive overhead type(s). Only allocations where both employee and overhead type are active are included in sums.
        </div>
      )}

      {/* Overhead Types CRUD */}
      <div
        style={{
          marginBottom: "2rem",
          padding: "1.5rem",
          border: "1px solid #ddd",
          borderRadius: "8px",
          backgroundColor: "#f9f9f9",
        }}
      >
        <h2 style={{ marginBottom: "1rem" }}>Overhead Types</h2>
        <form action={handleCreateType}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "1rem", alignItems: "end" }}>
            <div>
              <label htmlFor="name" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                placeholder="e.g., Management"
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
              <label htmlFor="amount" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Amount *
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
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
              <label htmlFor="period" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Period *
              </label>
              <select
                id="period"
                name="period"
                required
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  fontSize: "1rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              >
                <option value="annual">Annual</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="isActive"
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", marginBottom: "0.5rem" }}
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
                <span style={{ fontSize: "0.9rem", fontWeight: "500" }}>Active (default: true)</span>
              </label>
              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "0.5rem 1rem",
                  fontSize: "1rem",
                  backgroundColor: "#0070f3",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Create Type
              </button>
            </div>
          </div>
        </form>

        {/* Active Overhead Types List */}
        {activeOverheadTypes.length > 0 && (
          <div style={{ marginTop: "1.5rem" }}>
            <h3 style={{ marginBottom: "0.5rem", fontSize: "1rem", fontWeight: "500" }}>Active Overhead Types</h3>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                backgroundColor: "white",
                border: "1px solid #ddd",
                borderRadius: "4px",
                marginTop: "1rem",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f8f9fa" }}>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>Name</th>
                  <th style={{ padding: "0.75rem", textAlign: "right", borderBottom: "2px solid #ddd" }}>Amount</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>Period</th>
                  <th style={{ padding: "0.75rem", textAlign: "right", borderBottom: "2px solid #ddd" }}>Annual Equivalent</th>
                  <th style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd" }}>Status</th>
                  <th style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd" }}>Allocations</th>
                  <th style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeOverheadTypes.map((type) => (
                  <OverheadTypeRow
                    key={type.id}
                    overheadType={type}
                    totalShare={totalsByType.get(type.id) ?? 0}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Inactive Overhead Types (Collapsed Section) */}
        {inactiveOverheadCount > 0 && (
          <details style={{ marginTop: "1.5rem" }}>
            <summary
              style={{
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "500",
                marginBottom: "0.5rem",
                padding: "0.5rem",
                color: "#666",
              }}
            >
              Inactive Overhead Types ({inactiveOverheadCount})
            </summary>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                backgroundColor: "white",
                border: "1px solid #ddd",
                borderRadius: "4px",
                marginTop: "1rem",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f8f9fa" }}>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>Name</th>
                  <th style={{ padding: "0.75rem", textAlign: "right", borderBottom: "2px solid #ddd" }}>Amount</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>Period</th>
                  <th style={{ padding: "0.75rem", textAlign: "right", borderBottom: "2px solid #ddd" }}>Annual Equivalent</th>
                  <th style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd" }}>Status</th>
                  <th style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd" }}>Allocations</th>
                  <th style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {overheadTypes
                  .filter((t) => !t.isActive)
                  .map((type) => (
                    <OverheadTypeRow
                      key={type.id}
                      overheadType={type}
                      totalShare={totalsByType.get(type.id) ?? 0}
                    />
                  ))}
              </tbody>
            </table>
          </details>
        )}
      </div>

      {/* Allocation Grid - Only Active Items */}
      {activeOverheadTypes.length > 0 && (
        <div>
          <h2 style={{ marginBottom: "1rem" }}>Employee Overhead Allocations (Active Only)</h2>
          <AllocationGrid employees={activeEmployees} overheadTypes={activeOverheadTypes} totalsByType={totalsByType} />
        </div>
      )}

      {overheadTypes.length === 0 && (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: "#666",
            fontStyle: "italic",
            border: "1px solid #ddd",
            borderRadius: "8px",
            backgroundColor: "#f9f9f9",
          }}
        >
          No overhead types found. Create one above to start managing allocations.
        </div>
      )}
    </div>
  );
}
