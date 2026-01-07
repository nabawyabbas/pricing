import { db } from "@/lib/db";
import { OverheadTypesList } from "./OverheadTypesList";
import { EnhancedAllocationGrid } from "./EnhancedAllocationGrid";

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

export default async function OverheadsPage() {
  const overheadTypes = await getOverheadTypes();
  const employees = await getEmployees();

  // Filter to active items for calculations
  const activeOverheadTypes = overheadTypes.filter((t) => t.isActive);
  const activeEmployees = employees.filter((e) => e.isActive);

  // Calculate totals per overhead type (only active employees and active overhead types)
  const totalsByType = new Map<string, number>();
  activeOverheadTypes.forEach((type) => {
    const total = activeEmployees.reduce((sum, emp) => {
      const alloc = emp.overheadAllocs.find(
        (a) => a.overheadTypeId === type.id && a.overheadType.isActive
      );
      return sum + (alloc?.share ?? 0);
    }, 0);
    totalsByType.set(type.id, total);
  });

  // Calculate missing allocations per overhead type (only active employees and active overhead types)
  const missingAllocationsByType = new Map<string, number>();
  activeOverheadTypes.forEach((type) => {
    const missing = activeEmployees.filter((emp) => {
      const hasAllocation = emp.overheadAllocs.some(
        (a) => a.overheadTypeId === type.id && a.overheadType.isActive
      );
      return !hasAllocation;
    }).length;
    missingAllocationsByType.set(type.id, missing);
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Overhead Types List */}
        <div>
          <OverheadTypesList
            overheadTypes={overheadTypes}
            totalsByType={totalsByType}
            missingAllocationsByType={missingAllocationsByType}
          />
        </div>

        {/* Right Panel: Allocation Grid */}
        <div>
          <EnhancedAllocationGrid
            employees={employees}
            overheadTypes={overheadTypes}
            totalsByType={totalsByType}
            missingAllocationsByType={missingAllocationsByType}
          />
        </div>
      </div>
    </div>
  );
}
