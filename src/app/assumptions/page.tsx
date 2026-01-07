import { db } from "@/lib/db";
import { updateAssumptions } from "./actions";

async function getAssumptions() {
  return await db.assumptions.findFirst();
}

async function handleUpdate(formData: FormData) {
  "use server";
  await updateAssumptions(formData);
}

export default async function AssumptionsPage() {
  const assumptions = await getAssumptions();

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ marginBottom: "2rem" }}>Assumptions</h1>

      <div
        style={{
          padding: "1.5rem",
          border: "1px solid #ddd",
          borderRadius: "8px",
          backgroundColor: "#f9f9f9",
        }}
      >
        <h2 style={{ marginBottom: "1rem" }}>Edit Assumptions</h2>
        <form action={handleUpdate}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label
                  htmlFor="devReleasableHoursPerMonth"
                  style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
                >
                  Dev Releasable Hours Per Month *
                </label>
                <input
                  type="number"
                  id="devReleasableHoursPerMonth"
                  name="devReleasableHoursPerMonth"
                  step="1"
                  min="1"
                  required
                  defaultValue={assumptions?.devReleasableHoursPerMonth ?? 100}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    fontSize: "1rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                />
                <small style={{ color: "#666", fontSize: "0.85rem" }}>
                  Default: 100 hours
                </small>
              </div>
              <div>
                <label
                  htmlFor="standardHoursPerMonth"
                  style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
                >
                  Standard Hours Per Month *
                </label>
                <input
                  type="number"
                  id="standardHoursPerMonth"
                  name="standardHoursPerMonth"
                  step="1"
                  min="1"
                  required
                  defaultValue={assumptions?.standardHoursPerMonth ?? 160}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    fontSize: "1rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                />
                <small style={{ color: "#666", fontSize: "0.85rem" }}>
                  Default: 160 hours (for QA/BA hourly conversion)
                </small>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label
                  htmlFor="qaRatio"
                  style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
                >
                  QA Ratio (0-1)
                </label>
                <input
                  type="number"
                  id="qaRatio"
                  name="qaRatio"
                  step="0.01"
                  min="0"
                  max="1"
                  defaultValue={assumptions?.qaRatio ?? 0.5}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    fontSize: "1rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                />
                <small style={{ color: "#666", fontSize: "0.85rem" }}>
                  Default: 0.5 (0.5 QA hours per 1.0 Dev hour)
                </small>
              </div>
              <div>
                <label
                  htmlFor="baRatio"
                  style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
                >
                  BA Ratio (0-1)
                </label>
                <input
                  type="number"
                  id="baRatio"
                  name="baRatio"
                  step="0.01"
                  min="0"
                  max="1"
                  defaultValue={assumptions?.baRatio ?? 0.25}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    fontSize: "1rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                />
                <small style={{ color: "#666", fontSize: "0.85rem" }}>
                  Default: 0.25 (0.25 BA hours per 1.0 Dev hour)
                </small>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label
                  htmlFor="margin"
                  style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
                >
                  Margin (0-1)
                </label>
                <input
                  type="number"
                  id="margin"
                  name="margin"
                  step="0.01"
                  min="0"
                  defaultValue={assumptions?.margin ?? 0.2}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    fontSize: "1rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                />
                <small style={{ color: "#666", fontSize: "0.85rem" }}>
                  Default: 0.2 (20% margin)
                </small>
              </div>
              <div>
                <label
                  htmlFor="risk"
                  style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
                >
                  Risk (0-1)
                </label>
                <input
                  type="number"
                  id="risk"
                  name="risk"
                  step="0.01"
                  min="0"
                  defaultValue={assumptions?.risk ?? 0.1}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    fontSize: "1rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                />
                <small style={{ color: "#666", fontSize: "0.85rem" }}>
                  Default: 0.1 (10% risk factor)
                </small>
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
              Update Assumptions
            </button>
          </div>
        </form>
      </div>

      {/* Display current values */}
      {assumptions && (
        <div
          style={{
            marginTop: "2rem",
            padding: "1.5rem",
            border: "1px solid #ddd",
            borderRadius: "8px",
            backgroundColor: "white",
          }}
        >
          <h2 style={{ marginBottom: "1rem" }}>Current Assumptions</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
            }}
          >
            <div>
              <strong style={{ color: "#666", fontSize: "0.9rem" }}>Dev Releasable Hours/Month</strong>
              <div style={{ fontSize: "1.2rem", fontWeight: "500" }}>
                {assumptions.devReleasableHoursPerMonth}
              </div>
            </div>
            <div>
              <strong style={{ color: "#666", fontSize: "0.9rem" }}>Standard Hours/Month</strong>
              <div style={{ fontSize: "1.2rem", fontWeight: "500" }}>
                {assumptions.standardHoursPerMonth}
              </div>
            </div>
            <div>
              <strong style={{ color: "#666", fontSize: "0.9rem" }}>QA Ratio</strong>
              <div style={{ fontSize: "1.2rem", fontWeight: "500" }}>
                {assumptions.qaRatio} ({(assumptions.qaRatio * 100).toFixed(0)}%)
              </div>
            </div>
            <div>
              <strong style={{ color: "#666", fontSize: "0.9rem" }}>BA Ratio</strong>
              <div style={{ fontSize: "1.2rem", fontWeight: "500" }}>
                {assumptions.baRatio} ({(assumptions.baRatio * 100).toFixed(0)}%)
              </div>
            </div>
            <div>
              <strong style={{ color: "#666", fontSize: "0.9rem" }}>Margin</strong>
              <div style={{ fontSize: "1.2rem", fontWeight: "500" }}>
                {assumptions.margin} ({(assumptions.margin * 100).toFixed(0)}%)
              </div>
            </div>
            <div>
              <strong style={{ color: "#666", fontSize: "0.9rem" }}>Risk</strong>
              <div style={{ fontSize: "1.2rem", fontWeight: "500" }}>
                {assumptions.risk} ({(assumptions.risk * 100).toFixed(0)}%)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

