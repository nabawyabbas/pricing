import { db } from "@/lib/db";
import { createEmployee } from "./actions";
import { DeleteButton } from "./DeleteButton";
import { EmployeeForm } from "./EmployeeForm";
import { EmployeeItem } from "./EmployeeItem";
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

export default async function EmployeesPage() {
  const employees = await getEmployees();
  const techStacks = await getTechStacks();

  // Separate active and inactive employees
  const activeEmployees = employees.filter((e) => e.isActive);
  const inactiveEmployees = employees.filter((e) => !e.isActive);

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ marginBottom: "2rem" }}>Employees</h1>

      <EmployeeForm techStacks={techStacks} action={handleCreate} />

      <div>
        <h2 style={{ marginBottom: "1rem" }}>Active Employees ({activeEmployees.length})</h2>
        {activeEmployees.length === 0 ? (
          <p style={{ color: "#666", fontStyle: "italic" }}>
            No active employees yet. Create one above.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {activeEmployees.map((employee) => (
              <EmployeeItem key={employee.id} employee={employee} techStacks={techStacks} />
            ))}
          </div>
        )}
      </div>

      {/* Inactive Employees Section */}
      {inactiveEmployees.length > 0 && (
        <details style={{ marginTop: "2rem" }}>
          <summary
            style={{
              cursor: "pointer",
              fontSize: "1.1rem",
              fontWeight: "500",
              marginBottom: "1rem",
              padding: "0.5rem",
              color: "#666",
            }}
          >
            Inactive Employees ({inactiveEmployees.length})
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {inactiveEmployees.map((employee) => (
              <EmployeeItem key={employee.id} employee={employee} techStacks={techStacks} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
