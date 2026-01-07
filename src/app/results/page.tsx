import { db } from "@/lib/db";
import {
  calculatePricing,
  calculateQaCostPerDevRelHour,
  calculateBaCostPerDevRelHour,
  type Employee as PricingEmployee,
  type OverheadType,
  type Settings,
} from "@/lib/pricing";
import { Prisma } from "@prisma/client";
import { ExplainSection } from "./ExplainSection";

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
    // Parse value based on type
    if (setting.valueType === "float" || setting.valueType === "number") {
      settingsMap[setting.key] = Number.parseFloat(setting.value);
    } else if (setting.valueType === "integer") {
      settingsMap[setting.key] = Number.parseInt(setting.value, 10);
    } else if (setting.valueType === "boolean") {
      settingsMap[setting.key] = setting.value === "true" ? 1 : 0;
    } else {
      // For string, try to parse as number, fallback to 0
      const parsed = Number.parseFloat(setting.value);
      settingsMap[setting.key] = isNaN(parsed) ? 0 : parsed;
    }
  });
  return settingsMap;
}

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
    overheadAllocs: Array<{
      overheadTypeId: string;
      share: number;
    }>;
  }
): PricingEmployee {
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
    overheadAllocs: emp.overheadAllocs.map((alloc) => ({
      overheadTypeId: alloc.overheadTypeId,
      share: alloc.share,
    })),
  };
}

function formatCurrency(value: number | null): string {
  if (value === null) return "N/A";
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function ResultsPage() {
  const techStacks = await getTechStacks();
  const employees = await getEmployees();
  const overheadTypes = await getOverheadTypes();
  const settings = await getSettings();

  // Check if required settings exist
  const requiredSettings = [
    "dev_releasable_hours_per_month",
    "standard_hours_per_month",
    "qa_ratio",
    "ba_ratio",
    "margin",
    "risk",
  ];
  const missingSettings = requiredSettings.filter((key) => settings[key] === undefined);

  if (overheadTypes.length === 0 || missingSettings.length > 0) {
    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
        <h1 style={{ marginBottom: "2rem" }}>Pricing Results</h1>
        <div
          style={{
            padding: "1.5rem",
            border: "1px solid #ffc107",
            borderRadius: "8px",
            backgroundColor: "#fff3cd",
            color: "#856404",
          }}
        >
          <strong>Warning:</strong> Please configure{" "}
          {overheadTypes.length === 0 && "Overhead Types"}
          {overheadTypes.length === 0 && missingSettings.length > 0 && " and "}
          {missingSettings.length > 0 && `Settings (missing: ${missingSettings.join(", ")})`}
          {" "}before viewing results.
        </div>
      </div>
    );
  }

  const pricingEmployees = employees.map(convertEmployee);
  const exchangeRatio = settings.exchange_ratio ?? null;
  const currency = exchangeRatio && exchangeRatio > 0 ? "USD" : "EGP";

  // Calculate QA and BA costs (shared across all stacks)
  const qaEmployees = pricingEmployees.filter((emp) => emp.category === "QA");
  const baEmployees = pricingEmployees.filter((emp) => emp.category === "BA");

  const qaCostPerDevRelHour = calculateQaCostPerDevRelHour(
    qaEmployees,
    overheadTypes,
    settings
  );
  const baCostPerDevRelHour = calculateBaCostPerDevRelHour(
    baEmployees,
    overheadTypes,
    settings
  );

  // Calculate pricing for each tech stack
  const stackResults = techStacks.map((stack) => {
    const result = calculatePricing(stack.id, pricingEmployees, overheadTypes, settings);
    return {
      stack,
      result,
    };
  });

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ margin: 0 }}>Pricing Results</h1>
        {exchangeRatio && exchangeRatio > 0 && (
          <div style={{ fontSize: "0.9rem", color: "#666" }}>
            Currency: {currency} (Exchange Rate: 1 USD = {exchangeRatio} EGP)
          </div>
        )}
        {(!exchangeRatio || exchangeRatio <= 0) && (
          <div style={{ fontSize: "0.9rem", color: "#666" }}>
            Currency: {currency}
          </div>
        )}
      </div>

      {/* QA and BA Costs Section */}
      <div
        style={{
          marginBottom: "2rem",
          padding: "1.5rem",
          border: "1px solid #ddd",
          borderRadius: "8px",
          backgroundColor: "#f9f9f9",
        }}
      >
        <h2 style={{ marginBottom: "1rem" }}>Shared Costs {currency && `(${currency})`}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <strong style={{ color: "#666", fontSize: "0.9rem" }}>
              QA Cost per Dev Releaseable Hour
            </strong>
            <div style={{ fontSize: "1.5rem", fontWeight: "500", marginTop: "0.5rem" }}>
              {formatCurrency(qaCostPerDevRelHour)}
            </div>
          </div>
          <div>
            <strong style={{ color: "#666", fontSize: "0.9rem" }}>
              BA Cost per Dev Releaseable Hour
            </strong>
            <div style={{ fontSize: "1.5rem", fontWeight: "500", marginTop: "0.5rem" }}>
              {formatCurrency(baCostPerDevRelHour)}
            </div>
          </div>
        </div>
      </div>

      {/* Tech Stack Results */}
      <div>
        <h2 style={{ marginBottom: "1rem" }}>Per Tech Stack</h2>
        {stackResults.length === 0 ? (
          <p style={{ color: "#666", fontStyle: "italic" }}>
            No tech stacks found. Create tech stacks and assign DEV employees to view results.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {stackResults.map(({ stack, result }) => (
              <StackResultCard
                key={stack.id}
                stackName={stack.name}
                stackId={stack.id}
                result={result}
                employees={pricingEmployees}
                overheadTypes={overheadTypes}
                settings={settings}
                qaCostPerDevRelHour={qaCostPerDevRelHour}
                baCostPerDevRelHour={baCostPerDevRelHour}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StackResultCard({
  stackName,
  stackId,
  result,
  employees,
  overheadTypes,
  settings,
  qaCostPerDevRelHour,
  baCostPerDevRelHour,
}: {
  stackName: string;
  stackId: string;
  result: {
    devCostPerRelHour: number | null;
    qaCostPerDevRelHour: number;
    baCostPerDevRelHour: number;
    releaseableCost: number | null;
    finalPrice: number | null;
  };
  employees: PricingEmployee[];
  overheadTypes: OverheadType[];
  settings: Settings;
  qaCostPerDevRelHour: number;
  baCostPerDevRelHour: number;
}) {

  return (
    <div
      style={{
        padding: "1.5rem",
        border: "1px solid #ddd",
        borderRadius: "8px",
        backgroundColor: "white",
      }}
    >
      <h3 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>{stackName}</h3>

      {result.devCostPerRelHour === null ? (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#fff3cd",
            border: "1px solid #ffc107",
            borderRadius: "4px",
            color: "#856404",
          }}
        >
          No DEV employees assigned to this tech stack.
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div>
              <strong style={{ color: "#666", fontSize: "0.9rem" }}>
                Dev Cost per Releaseable Hour
              </strong>
              <div style={{ fontSize: "1.3rem", fontWeight: "500", marginTop: "0.5rem" }}>
                {formatCurrency(result.devCostPerRelHour)}
              </div>
            </div>
            <div>
              <strong style={{ color: "#666", fontSize: "0.9rem" }}>
                Releaseable Cost
              </strong>
              <div style={{ fontSize: "1.3rem", fontWeight: "500", marginTop: "0.5rem" }}>
                {formatCurrency(result.releaseableCost)}
              </div>
            </div>
            <div>
              <strong style={{ color: "#666", fontSize: "0.9rem" }}>Final Price</strong>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "600",
                  marginTop: "0.5rem",
                  color: "#0070f3",
                }}
              >
                {formatCurrency(result.finalPrice)}
              </div>
            </div>
          </div>

          <ExplainSection
            stackName={stackName}
            stackId={stackId}
            result={result}
            employees={employees}
            overheadTypes={overheadTypes}
            settings={settings}
            qaCostPerDevRelHour={qaCostPerDevRelHour}
            baCostPerDevRelHour={baCostPerDevRelHour}
          />
        </>
      )}
    </div>
  );
}
