import { db } from "@/lib/db";
import { OverheadTypesList } from "./OverheadTypesList";
import { EnhancedAllocationGrid } from "./EnhancedAllocationGrid";
import { type Settings } from "@/lib/pricing";

async function getOverheadTypes() {
  const types = await db.overheadType.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { allocations: true },
      },
    },
  });
  // Convert Prisma Decimal objects to numbers for Client Component
  return types.map((type) => ({
    id: type.id,
    name: type.name,
    amount: Number(type.amount),
    period: type.period,
    isActive: type.isActive,
    createdAt: type.createdAt,
    updatedAt: type.updatedAt,
    _count: type._count,
  }));
}

async function getEmployees() {
  const employeesRaw = await db.employee.findMany({
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
  // Convert Prisma Decimal objects to numbers for Client Component
  return employeesRaw.map((emp) => ({
    id: emp.id,
    name: emp.name,
    category: emp.category,
    isActive: emp.isActive,
    techStack: emp.techStack,
    grossMonthly: Number(emp.grossMonthly),
    overheadAllocs: emp.overheadAllocs.map((alloc) => ({
      id: alloc.id,
      overheadTypeId: alloc.overheadTypeId,
      share: alloc.share,
      overheadType: {
        name: alloc.overheadType.name,
        isActive: alloc.overheadType.isActive,
      },
    })),
  }));
}

async function getSettings(): Promise<Settings> {
  const settings = await db.setting.findMany();
  const settingsMap: Settings = {};
  settings.forEach((setting) => {
    if (setting.valueType === "float" || setting.valueType === "number") {
      settingsMap[setting.key] = Number.parseFloat(setting.value);
    } else if (setting.valueType === "integer") {
      settingsMap[setting.key] = Number.parseInt(setting.value, 10);
    } else if (setting.valueType === "boolean") {
      settingsMap[setting.key] = setting.value === "true" ? 1 : 0;
    } else {
      const parsed = Number.parseFloat(setting.value);
      settingsMap[setting.key] = isNaN(parsed) ? 0 : parsed;
    }
  });
  return settingsMap;
}

export default async function OverheadsPage() {
  const overheadTypes = await getOverheadTypes();
  const employees = await getEmployees();
  const settings = await getSettings();

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
      {/* Overhead Types List */}
      <OverheadTypesList
        overheadTypes={overheadTypes}
        totalsByType={totalsByType}
        missingAllocationsByType={missingAllocationsByType}
        settings={settings}
      />

      {/* Allocation Grid */}
      <EnhancedAllocationGrid
        employees={employees}
        overheadTypes={overheadTypes}
        totalsByType={totalsByType}
        missingAllocationsByType={missingAllocationsByType}
      />
    </div>
  );
}
