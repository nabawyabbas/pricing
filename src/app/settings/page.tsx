import { db } from "@/lib/db";
import { createSetting } from "./actions";
import { SettingRow } from "./SettingRow";

async function getSettings() {
  return await db.setting.findMany({
    orderBy: [{ group: "asc" }, { key: "asc" }],
  });
}

const DEFAULT_SETTINGS = [
  { key: "dev_releasable_hours_per_month", value: "100", valueType: "float" as const, group: "pricing", unit: "hours/month" },
  { key: "standard_hours_per_month", value: "160", valueType: "float" as const, group: "pricing", unit: "hours/month" },
  { key: "qa_ratio", value: "0.5", valueType: "float" as const, group: "pricing", unit: "ratio" },
  { key: "ba_ratio", value: "0.25", valueType: "float" as const, group: "pricing", unit: "ratio" },
  { key: "margin", value: "0.2", valueType: "float" as const, group: "pricing", unit: "ratio" },
  { key: "risk", value: "0.1", valueType: "float" as const, group: "pricing", unit: "ratio" },
  { key: "exchange_ratio", value: "0", valueType: "float" as const, group: "pricing", unit: "EGP per USD" },
];

async function handleCreate(formData: FormData) {
  "use server";
  await createSetting(formData);
}

function formatValue(value: string, valueType: string): string {
  if (valueType === "float" || valueType === "number") {
    const num = Number.parseFloat(value);
    if (!isNaN(num)) {
      return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    }
  }
  return value;
}

export default async function SettingsPage() {
  const settings = await getSettings();
  const settingsByKey = new Map(settings.map((s) => [s.key, s]));

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ marginBottom: "2rem" }}>Settings</h1>

      {/* Create New Setting */}
      <div
        style={{
          marginBottom: "2rem",
          padding: "1.5rem",
          border: "1px solid #ddd",
          borderRadius: "8px",
          backgroundColor: "#f9f9f9",
        }}
      >
        <h2 style={{ marginBottom: "1rem" }}>Create New Setting</h2>
        <form action={handleCreate}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "1rem", alignItems: "end" }}>
            <div>
              <label htmlFor="key" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Key *
              </label>
              <input
                type="text"
                id="key"
                name="key"
                required
                placeholder="e.g., dev_releasable_hours_per_month"
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  fontSize: "1rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              />
            </div>
            <div>
              <label htmlFor="value" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Value *
              </label>
              <input
                type="text"
                id="value"
                name="value"
                required
                placeholder="e.g., 100"
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  fontSize: "1rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              />
            </div>
            <div>
              <label htmlFor="valueType" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Type *
              </label>
              <select
                id="valueType"
                name="valueType"
                required
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  fontSize: "1rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="float">Float</option>
                <option value="integer">Integer</option>
                <option value="boolean">Boolean</option>
              </select>
            </div>
            <div>
              <label htmlFor="group" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Group
              </label>
              <input
                type="text"
                id="group"
                name="group"
                placeholder="e.g., pricing"
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  fontSize: "1rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              />
            </div>
            <div>
              <label htmlFor="unit" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Unit
              </label>
              <input
                type="text"
                id="unit"
                name="unit"
                placeholder="e.g., hours/month"
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  fontSize: "1rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              />
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
            Create Setting
          </button>
        </form>
      </div>

      {/* Default Settings Quick Add */}
      <div
        style={{
          marginBottom: "2rem",
          padding: "1.5rem",
          border: "1px solid #ddd",
          borderRadius: "8px",
          backgroundColor: "#fff",
        }}
      >
        <h2 style={{ marginBottom: "1rem" }}>Default Settings</h2>
        <p style={{ color: "#666", marginBottom: "1rem", fontSize: "0.9rem" }}>
          Quick add default pricing settings if they don't exist:
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {DEFAULT_SETTINGS.map((defaultSetting) => {
            const exists = settingsByKey.has(defaultSetting.key);
            return (
              <form key={defaultSetting.key} action={handleCreate} style={{ display: "inline" }}>
                <input type="hidden" name="key" value={defaultSetting.key} />
                <input type="hidden" name="value" value={defaultSetting.value} />
                <input type="hidden" name="valueType" value={defaultSetting.valueType} />
                <input type="hidden" name="group" value={defaultSetting.group} />
                <input type="hidden" name="unit" value={defaultSetting.unit} />
                <button
                  type="submit"
                  disabled={exists}
                  style={{
                    padding: "0.4rem 0.8rem",
                    fontSize: "0.85rem",
                    backgroundColor: exists ? "#ccc" : "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: exists ? "not-allowed" : "pointer",
                    opacity: exists ? 0.6 : 1,
                  }}
                >
                  {exists ? "✓ " : "+ "}
                  {defaultSetting.key}
                </button>
              </form>
            );
          })}
        </div>
      </div>

      {/* Settings List */}
      <div>
        <h2 style={{ marginBottom: "1rem" }}>All Settings</h2>
        {settings.length === 0 ? (
          <p style={{ color: "#666", fontStyle: "italic" }}>No settings found. Create one above or use the default settings.</p>
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
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>Key</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>Value</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>Type</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>Group</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>Unit</th>
                  <th style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {settings.map((setting) => (
                  <SettingRow key={setting.id} setting={setting} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

