import { db } from "@/lib/db";
import {
  updateOverheadPool,
  allocateEqually,
  allocateProportionalToGross,
  normalizeTo100Percent,
} from "./actions";
import { EmployeeAllocationRow } from "./EmployeeAllocationRow";
import { Prisma } from "@prisma/client";

async function getOverheadPool() {
  return await db.overheadPool.findFirst();
}

async function getEmployees() {
  return await db.employee.findMany({
    include: {
      techStack: true,
      overheadAlloc: true,
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

async function handleUpdatePool(formData: FormData) {
  "use server";
  await updateOverheadPool(formData);
}


async function handleAllocateEqually() {
  "use server";
  await allocateEqually();
}

async function handleAllocateProportional() {
  "use server";
  await allocateProportionalToGross();
}

async function handleNormalize() {
  "use server";
  await normalizeTo100Percent();
}

function formatDecimal(value: Prisma.Decimal | null): string {
  return value ? Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00";
}

function formatFloat(value: number | null): string {
  if (value === null) return "";
  return (value * 100).toFixed(2);
}

function calculateTotals(employees: Array<{
  overheadAlloc: { mgmtShare: number; companyShare: number } | null;
}>) {
  const totals = employees.reduce(
    (acc, emp) => {
      if (emp.overheadAlloc) {
        acc.mgmt += emp.overheadAlloc.mgmtShare;
        acc.company += emp.overheadAlloc.companyShare;
      }
      return acc;
    },
    { mgmt: 0, company: 0 }
  );
  return totals;
}

export default async function OverheadsPage() {
  const overheadPool = await getOverheadPool();
  const employees = await getEmployees();
  const totals = calculateTotals(employees);
  const isWarning = Math.abs(totals.mgmt - 1) > 0.01 || Math.abs(totals.company - 1) > 0.01;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ marginBottom: "2rem" }}>Overhead Management</h1>

      {/* Overhead Pool Section */}
      <div
        style={{
          marginBottom: "2rem",
          padding: "1.5rem",
          border: "1px solid #ddd",
          borderRadius: "8px",
          backgroundColor: "#f9f9f9",
        }}
      >
        <h2 style={{ marginBottom: "1rem" }}>Overhead Pools (Annual)</h2>
        <form action={handleUpdatePool}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label
                htmlFor="managementOverheadAnnual"
                style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
              >
                Management Overhead Annual
              </label>
              <input
                type="number"
                id="managementOverheadAnnual"
                name="managementOverheadAnnual"
                step="0.01"
                required
                defaultValue={overheadPool ? formatDecimal(overheadPool.managementOverheadAnnual) : ""}
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
                htmlFor="companyOverheadAnnual"
                style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
              >
                Company Overhead Annual
              </label>
              <input
                type="number"
                id="companyOverheadAnnual"
                name="companyOverheadAnnual"
                step="0.01"
                required
                defaultValue={overheadPool ? formatDecimal(overheadPool.companyOverheadAnnual) : ""}
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
          <button
            type="submit"
            style={{
              marginTop: "1rem",
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
            Update Overhead Pools
          </button>
        </form>
      </div>

      {/* Allocation Buttons */}
      <div
        style={{
          marginBottom: "1rem",
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <form action={handleAllocateEqually}>
          <button
            type="submit"
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.9rem",
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
        <form action={handleAllocateProportional}>
          <button
            type="submit"
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.9rem",
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
        <form action={handleNormalize}>
          <button
            type="submit"
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.9rem",
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

      {/* Warning if shares don't sum to 1 */}
      {isWarning && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "1rem",
            backgroundColor: "#fff3cd",
            border: "1px solid #ffc107",
            borderRadius: "4px",
            color: "#856404",
          }}
        >
          <strong>Warning:</strong> Shares do not sum to 100%. Management:{" "}
          {(totals.mgmt * 100).toFixed(2)}%, Company: {(totals.company * 100).toFixed(2)}%
        </div>
      )}

      {/* Employee Allocation Table */}
      <div>
        <h2 style={{ marginBottom: "1rem" }}>Employee Overhead Allocations</h2>
        {employees.length === 0 ? (
          <p style={{ color: "#666", fontStyle: "italic" }}>No employees found.</p>
        ) : (
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
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>Name</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>Category</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>Tech Stack</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>Gross Monthly</th>
                  <th style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd" }}>Mgmt Share (%)</th>
                  <th style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd" }}>Company Share (%)</th>
                  <th style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <EmployeeAllocationRow key={employee.id} employee={employee} />
                ))}
                <tr style={{ backgroundColor: "#f8f9fa", fontWeight: "bold" }}>
                  <td colSpan={4} style={{ padding: "0.75rem", textAlign: "right" }}>
                    Totals:
                  </td>
                  <td style={{ padding: "0.75rem", textAlign: "center" }}>
                    {(totals.mgmt * 100).toFixed(2)}%
                  </td>
                  <td style={{ padding: "0.75rem", textAlign: "center" }}>
                    {(totals.company * 100).toFixed(2)}%
                  </td>
                  <td style={{ padding: "0.75rem" }}></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


