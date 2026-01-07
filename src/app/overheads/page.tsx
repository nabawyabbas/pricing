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

  // Calculate totals per overhead type
  const totalsByType = new Map<string, number>();
  overheadTypes.forEach((type) => {
    const total = employees.reduce((sum, emp) => {
      const alloc = emp.overheadAllocs.find((a) => a.overheadTypeId === type.id);
      return sum + (alloc?.share ?? 0);
    }, 0);
    totalsByType.set(type.id, total);
  });

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ marginBottom: "2rem" }}>Overhead Management</h1>

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

        {/* Overhead Types List */}
        {overheadTypes.length > 0 && (
          <div style={{ marginTop: "1.5rem" }}>
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
                  <th style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd" }}>Allocations</th>
                  <th style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {overheadTypes.map((type) => (
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
      </div>

      {/* Allocation Grid */}
      {overheadTypes.length > 0 && (
        <div>
          <h2 style={{ marginBottom: "1rem" }}>Employee Overhead Allocations</h2>
          <AllocationGrid employees={employees} overheadTypes={overheadTypes} totalsByType={totalsByType} />
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
