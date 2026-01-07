"use client";

import { useState } from "react";
import { updateSetting } from "./actions";
import { DeleteButton } from "./DeleteButton";

interface SettingRowProps {
  setting: {
    id: string;
    key: string;
    value: string;
    valueType: string;
    group: string;
    unit: string | null;
  };
}

export function SettingRow({ setting }: SettingRowProps) {
  const [value, setValue] = useState(setting.value);

  async function handleUpdate(formData: FormData) {
    if (formData.get("value") !== setting.value) {
      await updateSetting(formData);
    }
  }

  return (
    <tr>
      <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd" }}>
        <code style={{ fontSize: "0.9rem", color: "#0070f3" }}>{setting.key}</code>
      </td>
      <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd" }}>
        <form action={handleUpdate} style={{ display: "inline" }}>
          <input type="hidden" name="id" value={setting.id} />
          <input type="hidden" name="key" value={setting.key} />
          <input type="hidden" name="valueType" value={setting.valueType} />
          <input type="hidden" name="group" value={setting.group} />
          <input type="hidden" name="unit" value={setting.unit ?? ""} />
          <input
            type="text"
            name="value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={(e) => {
              if (e.target.value !== setting.value) {
                e.target.form?.requestSubmit();
              }
            }}
            style={{
              width: "150px",
              padding: "0.25rem 0.5rem",
              fontSize: "0.9rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </form>
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
          {setting.valueType}
        </span>
      </td>
      <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd" }}>{setting.group}</td>
      <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd" }}>{setting.unit || "-"}</td>
      <td style={{ padding: "0.75rem", borderBottom: "1px solid #ddd", textAlign: "center" }}>
        <DeleteButton settingId={setting.id} settingKey={setting.key} />
      </td>
    </tr>
  );
}

