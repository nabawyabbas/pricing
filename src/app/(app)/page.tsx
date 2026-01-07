import { db } from "@/lib/db";
import {
  type Employee,
  type OverheadType,
  type Settings,
  calculatePricing,
  getExchangeRatio,
} from "@/lib/pricing";
import {
  calculateTotalMonthlyCost,
  calculateTotalOverheadMonthly,
  getOverheadAllocationSum,
  countEmployeesMissingAllocation,
  isAllocationValid,
  findMissingSettings,
  convertToMonthly,
} from "@/lib/dashboard";
import { calculateFullyLoadedMonthly } from "@/lib/pricing";
import { Prisma } from "@prisma/client";
import { formatMoney, formatPercent, formatNumber, type Currency } from "@/lib/format";

// Load all data efficiently
async function getTechStacks() {
  return await db.techStack.findMany({
    orderBy: { name: "asc" },
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

async function getOverheadTypes(): Promise<OverheadType[]> {
  const types = await db.overheadType.findMany({
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

// Convert Prisma employee to pricing Employee, filtering inactive allocations
function convertEmployee(
  emp: {
    id: string;
    name: string;
    category: string;
    techStackId: string | null;
    grossMonthly: Prisma.Decimal;
    netMonthly: Prisma.Decimal;
    oncostRate: number | null;
    annualBenefits: Prisma.Decimal | null;
    annualBonus: Prisma.Decimal | null;
    fte: number;
    isActive: boolean;
    overheadAllocs: Array<{
      overheadTypeId: string;
      share: number;
      overheadType: {
        isActive: boolean;
      };
    }>;
  },
  activeOverheadTypeIds: Set<string>
): Employee {
  // Filter allocations to only include those where overheadType is active
  const activeAllocs = emp.overheadAllocs.filter(
    (alloc) => activeOverheadTypeIds.has(alloc.overheadTypeId)
  );

  return {
    id: emp.id,
    name: emp.name,
    category: emp.category as "DEV" | "QA" | "BA",
    techStackId: emp.techStackId,
    grossMonthly: Number(emp.grossMonthly),
    netMonthly: Number(emp.netMonthly),
    oncostRate: emp.oncostRate,
    annualBenefits: emp.annualBenefits ? Number(emp.annualBenefits) : null,
    annualBonus: emp.annualBonus ? Number(emp.annualBonus) : null,
    fte: emp.fte,
    overheadAllocs: activeAllocs.map((alloc) => ({
      overheadTypeId: alloc.overheadTypeId,
      share: alloc.share,
    })),
  };
}


export default async function DashboardPage() {
  const techStacks = await getTechStacks();
  const employeesRaw = await getEmployees();
  const overheadTypesRaw = await getOverheadTypes();
  const settings = await getSettings();

  // Get active overhead type IDs from database
  const allOverheadTypesFromDb = await db.overheadType.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  const activeOverheadTypeIds = new Set(allOverheadTypesFromDb.map((t) => t.id));
  const activeOverheadTypes = overheadTypesRaw.filter((t) => activeOverheadTypeIds.has(t.id));

  // Filter employees to active only
  const activeEmployeesRaw = employeesRaw.filter((e) => e.isActive);
  const employees = activeEmployeesRaw.map((emp) => convertEmployee(emp, activeOverheadTypeIds));

  // Count inactive items for warnings
  const inactiveEmployeeCount = employeesRaw.filter((e) => !e.isActive).length;
  const inactiveOverheadCount = overheadTypesRaw.length - activeOverheadTypes.length;

  const exchangeRatio = getExchangeRatio(settings);
  const currency: Currency = exchangeRatio && exchangeRatio > 0 ? "USD" : "EGP";

  // Group employees
  const devEmployees = employees.filter((e) => e.category === "DEV");
  const qaEmployees = employees.filter((e) => e.category === "QA");
  const baEmployees = employees.filter((e) => e.category === "BA");

  // Calculate KPIs (only active items)
  const totalMonthlyCost = calculateTotalMonthlyCost(employees, activeOverheadTypes, exchangeRatio);
  const totalOverheadMonthly = calculateTotalOverheadMonthly(activeOverheadTypes, exchangeRatio);

  // Group DEV employees by tech stack
  const devByStack = new Map<string, Employee[]>();
  devEmployees.forEach((emp) => {
    const stackId = emp.techStackId || "unassigned";
    if (!devByStack.has(stackId)) {
      devByStack.set(stackId, []);
    }
    devByStack.get(stackId)!.push(emp);
  });

  // Calculate stack pricing (only active items)
  const stackData = techStacks.map((stack) => {
    const stackDevs = devByStack.get(stack.id) || [];
    const result = calculatePricing(stack.id, employees, activeOverheadTypes, settings);
    const totalFte = stackDevs.reduce((sum, emp) => sum + emp.fte, 0);
    const stackMonthlyCost = stackDevs.reduce(
      (sum, emp) => sum + calculateFullyLoadedMonthly(emp, activeOverheadTypes, exchangeRatio),
      0
    );

    return {
      stack,
      devCount: stackDevs.length,
      totalFte,
      monthlyCost: stackMonthlyCost,
      result,
    };
  });

  // Calculate overhead allocation data (only active items)
  const overheadData = activeOverheadTypes.map((type) => {
    const allocationSum = getOverheadAllocationSum(type.id, employees);
    const missingCount = countEmployeesMissingAllocation(type.id, employees);
    const monthlyEquivalent = convertToMonthly(type.amount, type.period);
    const monthlyEquivalentConverted = exchangeRatio && exchangeRatio > 0
      ? monthlyEquivalent / exchangeRatio
      : monthlyEquivalent;

    return {
      type,
      allocationSum,
      missingCount,
      monthlyEquivalent,
      monthlyEquivalentConverted,
      isValid: isAllocationValid(allocationSum),
    };
  });

  // Data quality checks
  const missingSettings = findMissingSettings(settings);
  const invalidOverheads = overheadData.filter((d) => !d.isValid);
  const employeesWithMissingAllocs = employees.filter((emp) => {
    return activeOverheadTypes.some((type) => {
      return !emp.overheadAllocs?.some((a) => a.overheadTypeId === type.id);
    });
  });

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto" }}>

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
          <strong>Note:</strong> Excluding from calculations: {inactiveEmployeeCount} inactive employee(s) and {inactiveOverheadCount} inactive overhead type(s). Only active items are included in all cost/rate calculations.
        </div>
      )}

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            padding: "1.5rem",
            border: "1px solid #ddd",
            borderRadius: "8px",
            backgroundColor: "#f9f9f9",
          }}
        >
          <div style={{ fontSize: "0.9rem", color: "#666", marginBottom: "0.5rem" }}>Total Employees (Active)</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "600" }}>
            {employees.length}
          </div>
          <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.5rem" }}>
            DEV: {devEmployees.length} | QA: {qaEmployees.length} | BA: {baEmployees.length}
          </div>
          {inactiveEmployeeCount > 0 && (
            <div style={{ fontSize: "0.75rem", color: "#856404", marginTop: "0.5rem" }}>
              ({inactiveEmployeeCount} inactive excluded)
            </div>
          )}
        </div>

        <div
          style={{
            padding: "1.5rem",
            border: "1px solid #ddd",
            borderRadius: "8px",
            backgroundColor: "#f9f9f9",
          }}
        >
          <div style={{ fontSize: "0.9rem", color: "#666", marginBottom: "0.5rem" }}>
            Total Monthly Cost ({currency})
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: "600" }}>
            {formatMoney(totalMonthlyCost, currency)}
          </div>
          <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.5rem" }}>
            Fully-loaded (active employees only)
          </div>
        </div>

        <div
          style={{
            padding: "1.5rem",
            border: "1px solid #ddd",
            borderRadius: "8px",
            backgroundColor: "#f9f9f9",
          }}
        >
          <div style={{ fontSize: "0.9rem", color: "#666", marginBottom: "0.5rem" }}>
            Total Overhead Monthly ({currency})
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: "600" }}>
            {formatMoney(totalOverheadMonthly, currency)}
          </div>
          <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.5rem" }}>
            Sum of active overhead types
          </div>
          {inactiveOverheadCount > 0 && (
            <div style={{ fontSize: "0.75rem", color: "#856404", marginTop: "0.5rem" }}>
              ({inactiveOverheadCount} inactive excluded)
            </div>
          )}
        </div>
      </div>

      {/* Stacks Table */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>Tech Stacks</h2>
        {stackData.length === 0 ? (
          <p style={{ color: "#666", fontStyle: "italic" }}>No tech stacks found.</p>
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
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>Stack Name</th>
                  <th style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd" }}>DEV Count</th>
                  <th style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd" }}>Total FTE</th>
                  <th style={{ padding: "0.75rem", textAlign: "right", borderBottom: "2px solid #ddd" }}>
                    Monthly Cost ({currency})
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "right", borderBottom: "2px solid #ddd" }}>
                    Dev Cost/Hour ({currency})
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "right", borderBottom: "2px solid #ddd" }}>
                    Releaseable Cost/Hour ({currency})
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "right", borderBottom: "2px solid #ddd" }}>
                    Final Price/Hour ({currency})
                  </th>
                </tr>
              </thead>
              <tbody>
                {stackData.map(({ stack, devCount, totalFte, monthlyCost, result }) => (
                  <tr key={stack.id}>
                    <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd" }}>{stack.name}</td>
                    <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd", textAlign: "center" }}>
                      {devCount}
                    </td>
                    <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd", textAlign: "center" }}>
                      {formatNumber(totalFte, 2)}
                    </td>
                    <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd", textAlign: "right" }}>
                      {formatMoney(monthlyCost, currency)}
                    </td>
                    <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd", textAlign: "right" }}>
                      {result.devCostPerRelHour !== null
                        ? formatMoney(result.devCostPerRelHour, currency)
                        : "N/A"}
                    </td>
                    <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd", textAlign: "right" }}>
                      {result.releaseableCost !== null
                        ? formatMoney(result.releaseableCost, currency)
                        : "N/A"}
                    </td>
                    <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd", textAlign: "right" }}>
                      {formatMoney(result.finalPrice, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Overheads Table */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>Overheads (Active Only)</h2>
        {overheadData.length === 0 ? (
          <p style={{ color: "#666", fontStyle: "italic" }}>No active overhead types found.</p>
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
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>Overhead Name</th>
                  <th style={{ padding: "0.75rem", textAlign: "right", borderBottom: "2px solid #ddd" }}>
                    Amount ({currency})
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>Period</th>
                  <th style={{ padding: "0.75rem", textAlign: "right", borderBottom: "2px solid #ddd" }}>
                    Monthly Equivalent ({currency})
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd" }}>
                    Allocation Sum %
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd" }}>
                    Missing Allocations
                  </th>
                </tr>
              </thead>
              <tbody>
                {overheadData.map(({ type, allocationSum, missingCount, monthlyEquivalentConverted, isValid }) => {
                  const amountConverted = exchangeRatio && exchangeRatio > 0
                    ? type.amount / exchangeRatio
                    : type.amount;

                  return (
                    <tr
                      key={type.id}
                      style={{
                        backgroundColor: !isValid ? "#fff3cd" : "white",
                      }}
                    >
                      <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd" }}>{type.name}</td>
                      <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd", textAlign: "right" }}>
                        {formatMoney(amountConverted, currency)}
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
                          {type.period}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd", textAlign: "right" }}>
                        {formatMoney(monthlyEquivalentConverted, currency)}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: "1px solid #ddd",
                          textAlign: "center",
                          color: !isValid ? "#dc3545" : "#28a745",
                          fontWeight: !isValid ? "600" : "normal",
                        }}
                      >
                        {formatPercent(allocationSum, "decimal")}
                      </td>
                      <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd", textAlign: "center" }}>
                        {missingCount > 0 ? (
                          <span style={{ color: "#dc3545", fontWeight: "500" }}>{missingCount}</span>
                        ) : (
                          <span style={{ color: "#28a745" }}>0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Data Quality Warnings */}
      {(missingSettings.length > 0 || invalidOverheads.length > 0 || employeesWithMissingAllocs.length > 0) && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ marginBottom: "1rem", color: "#856404" }}>Data Quality Warnings</h2>
          <div
            style={{
              padding: "1.5rem",
              border: "1px solid #ffc107",
              borderRadius: "8px",
              backgroundColor: "#fff3cd",
            }}
          >
            {missingSettings.length > 0 && (
              <div style={{ marginBottom: "1rem" }}>
                <strong style={{ color: "#856404" }}>Missing Required Settings:</strong>
                <ul style={{ marginTop: "0.5rem", marginLeft: "1.5rem", color: "#856404" }}>
                  {missingSettings.map((key) => (
                    <li key={key}>{key}</li>
                  ))}
                </ul>
              </div>
            )}

            {invalidOverheads.length > 0 && (
              <div style={{ marginBottom: "1rem" }}>
                <strong style={{ color: "#856404" }}>
                  Overhead Types with Invalid Allocation Sums (not ~100%):
                </strong>
                <ul style={{ marginTop: "0.5rem", marginLeft: "1.5rem", color: "#856404" }}>
                  {invalidOverheads.map(({ type, allocationSum }) => (
                    <li key={type.id}>
                      {type.name}: {(allocationSum * 100).toFixed(2)}%
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {employeesWithMissingAllocs.length > 0 && (
              <div>
                <strong style={{ color: "#856404" }}>
                  Employees Missing Allocation Rows ({employeesWithMissingAllocs.length}):
                </strong>
                <ul style={{ marginTop: "0.5rem", marginLeft: "1.5rem", color: "#856404" }}>
                  {employeesWithMissingAllocs.slice(0, 10).map((emp) => (
                    <li key={emp.id}>
                      {emp.name} ({emp.category})
                    </li>
                  ))}
                  {employeesWithMissingAllocs.length > 10 && (
                    <li style={{ fontStyle: "italic" }}>
                      ... and {employeesWithMissingAllocs.length - 10} more
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No warnings message */}
      {missingSettings.length === 0 &&
        invalidOverheads.length === 0 &&
        employeesWithMissingAllocs.length === 0 && (
          <div
            style={{
              padding: "1.5rem",
              border: "1px solid #28a745",
              borderRadius: "8px",
              backgroundColor: "#d4edda",
              color: "#155724",
            }}
          >
            ✓ All data quality checks passed. No warnings.
          </div>
        )}
    </div>
  );
}
