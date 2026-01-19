import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ViewDetail } from "./ViewDetail";
import {
  getEmployeeOverrides,
  getOverheadTypeOverrides,
} from "@/lib/views";
import { getEffectiveSettings } from "@/lib/effective-settings";

async function getView(id: string) {
  return await db.pricingView.findUnique({
    where: { id },
  });
}

async function getEmployees() {
  return await db.employee.findMany({
    include: {
      techStack: true,
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

async function getOverheadTypes() {
  return await db.overheadType.findMany({
    orderBy: { name: "asc" },
  });
}

async function getSettings() {
  return await db.setting.findMany({
    orderBy: [{ group: "asc" }, { key: "asc" }],
  });
}

async function getSettingOverrides(viewId: string) {
  return await db.settingOverride.findMany({
    where: { viewId },
  });
}

async function getBaseAllocations() {
  return await db.overheadAllocation.findMany({
    include: {
      employee: {
        select: { id: true, name: true, category: true, isActive: true },
      },
      overheadType: {
        select: { id: true, name: true, isActive: true },
      },
    },
  });
}

async function getAllocationOverrides(viewId: string) {
  return await db.overheadAllocationOverride.findMany({
    where: { viewId },
    include: {
      employee: {
        select: { id: true, name: true, category: true, isActive: true },
      },
      overheadType: {
        select: { id: true, name: true, isActive: true },
      },
    },
  });
}

export default async function ViewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const view = await getView(id);

  if (!view) {
    notFound();
  }

  const employees = await getEmployees();
  const overheadTypes = await getOverheadTypes();
  const settings = await getSettings();
  const employeeOverrides = await getEmployeeOverrides(id);
  const overheadTypeOverrides = await getOverheadTypeOverrides(id);
  const settingOverrides = await getSettingOverrides(id);
  const effectiveSettings = await getEffectiveSettings(id);
  const baseAllocations = await getBaseAllocations();
  const allocationOverrides = await getAllocationOverrides(id);

  return (
    <ViewDetail
        view={view}
        employees={employees.map((emp) => ({
          id: emp.id,
          name: emp.name,
          category: emp.category,
          techStack: emp.techStack,
          isActive: emp.isActive,
          grossMonthly: Number(emp.grossMonthly),
        }))}
        overheadTypes={overheadTypes.map((type) => ({
          id: type.id,
          name: type.name,
          isActive: type.isActive,
          amount: Number(type.amount),
        }))}
        settings={settings}
        employeeOverrides={employeeOverrides}
        overheadTypeOverrides={overheadTypeOverrides}
        settingOverrides={new Map(settingOverrides.map((o) => [o.key, o]))}
        effectiveSettings={effectiveSettings}
        baseAllocations={baseAllocations.map((alloc) => ({
          employeeId: alloc.employeeId,
          overheadTypeId: alloc.overheadTypeId,
          share: alloc.share,
        }))}
        allocationOverrides={new Map(
          allocationOverrides.map((o) => [
            `${o.employeeId}:${o.overheadTypeId}`,
            { share: o.share },
          ])
        )}
      />
  );
}

