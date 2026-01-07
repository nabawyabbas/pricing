import { db } from "@/lib/db";
import { createEmployee } from "./actions";
import { DeleteButton } from "./DeleteButton";
import { EmployeeForm } from "./EmployeeForm";
import { Prisma } from "@prisma/client";

async function getEmployees() {
  return await db.employee.findMany({
    include: {
      techStack: true,
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

async function getTechStacks() {
  return await db.techStack.findMany({
    orderBy: { name: "asc" },
  });
}

async function handleCreate(formData: FormData) {
  "use server";
  await createEmployee(formData);
}

function formatDecimal(value: Prisma.Decimal | null): string {
  return value ? value.toString() : "";
}

function formatFloat(value: number | null): string {
  return value !== null ? value.toString() : "";
}

export default async function EmployeesPage() {
  const employees = await getEmployees();
  const techStacks = await getTechStacks();

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ marginBottom: "2rem" }}>Employees</h1>

      <EmployeeForm techStacks={techStacks} action={handleCreate} />

      <div>
        <h2 style={{ marginBottom: "1rem" }}>Existing Employees</h2>
        {employees.length === 0 ? (
          <p style={{ color: "#666", fontStyle: "italic" }}>
            No employees yet. Create one above.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {employees.map((employee) => (
              <EmployeeItem key={employee.id} employee={employee} techStacks={techStacks} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmployeeItem({
  employee,
  techStacks,
}: {
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
  };
  techStacks: { id: string; name: string }[];
}) {
  return (
    <div
      style={{
        padding: "1rem",
        border: "1px solid #ddd",
        borderRadius: "4px",
        backgroundColor: "white",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "0.5rem" }}>
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

