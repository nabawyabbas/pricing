import { db } from "@/lib/db";
import { EmployeeForm } from "./EmployeeForm";
import { EmployeeTable } from "./EmployeeTable";
import { getExchangeRatio, type Settings } from "@/lib/pricing";

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

async function getTechStacks() {
  return await db.techStack.findMany({
    orderBy: { name: "asc" },
  });
}

async function getOverheadTypes() {
  const types = await db.overheadType.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return types.map((type) => ({
    id: type.id,
    name: type.name,
    amount: Number(type.amount),
    period: type.period as "annual" | "monthly" | "quarterly",
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

export default async function EmployeesPage() {
  const employees = await getEmployees();
  const techStacks = await getTechStacks();
  const overheadTypes = await getOverheadTypes();
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <EmployeeForm techStacks={techStacks} settings={settings} />
      <EmployeeTable
        employees={employees}
        techStacks={techStacks}
        overheadTypes={overheadTypes}
        settings={settings}
      />
    </div>
  );
}
