import { db } from "@/lib/db";
import {
  calculatePricing,
  calculateQaCostPerDevRelHour,
  calculateBaCostPerDevRelHour,
  calculateFullyLoadedMonthly,
  type Employee as PricingEmployee,
  type OverheadPool,
  type Assumptions,
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
      overheadAlloc: true,
    },
  });
}

async function getOverheadPool(): Promise<OverheadPool | null> {
  const pool = await db.overheadPool.findFirst();
  if (!pool) return null;
  return {
    managementOverheadAnnual: Number(pool.managementOverheadAnnual),
    companyOverheadAnnual: Number(pool.companyOverheadAnnual),
  };
}

async function getAssumptions(): Promise<Assumptions | null> {
  const assumptions = await db.assumptions.findFirst();
  if (!assumptions) return null;
  return {
    devReleasableHoursPerMonth: assumptions.devReleasableHoursPerMonth,
    standardHoursPerMonth: assumptions.standardHoursPerMonth,
    qaRatio: assumptions.qaRatio,
    baRatio: assumptions.baRatio,
    margin: assumptions.margin,
    risk: assumptions.risk,
  };
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
    overheadAlloc: { mgmtShare: number; companyShare: number } | null;
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
    overheadAlloc: emp.overheadAlloc
      ? {
          mgmtShare: emp.overheadAlloc.mgmtShare,
          companyShare: emp.overheadAlloc.companyShare,
        }
      : null,
  };
}

function formatCurrency(value: number | null): string {
  if (value === null) return "N/A";
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function ResultsPage() {
  const techStacks = await getTechStacks();
  const employees = await getEmployees();
  const overheadPool = await getOverheadPool();
  const assumptions = await getAssumptions();

  if (!overheadPool || !assumptions) {
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
          <strong>Warning:</strong> Please configure Overhead Pools and Assumptions before viewing results.
        </div>
      </div>
    );
  }

  const pricingEmployees = employees.map(convertEmployee);

  // Calculate QA and BA costs (shared across all stacks)
  const qaEmployees = pricingEmployees.filter((emp) => emp.category === "QA");
  const baEmployees = pricingEmployees.filter((emp) => emp.category === "BA");

  const qaCostPerDevRelHour = calculateQaCostPerDevRelHour(
    qaEmployees,
    overheadPool,
    assumptions
  );
  const baCostPerDevRelHour = calculateBaCostPerDevRelHour(
    baEmployees,
    overheadPool,
    assumptions
  );

  // Calculate pricing for each tech stack
  const stackResults = techStacks.map((stack) => {
    const result = calculatePricing(stack.id, pricingEmployees, overheadPool, assumptions);
    return {
      stack,
      result,
    };
  });

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ marginBottom: "2rem" }}>Pricing Results</h1>

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
        <h2 style={{ marginBottom: "1rem" }}>Shared Costs</h2>
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
                overheadPool={overheadPool}
                assumptions={assumptions}
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
  overheadPool,
  assumptions,
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
  overheadPool: OverheadPool;
  assumptions: Assumptions;
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
            overheadPool={overheadPool}
            assumptions={assumptions}
            qaCostPerDevRelHour={qaCostPerDevRelHour}
            baCostPerDevRelHour={baCostPerDevRelHour}
          />
        </>
      )}
    </div>
  );
}

