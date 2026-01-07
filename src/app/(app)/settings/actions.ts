"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createSetting(formData: FormData) {
  const key = formData.get("key") as string;
  const value = formData.get("value") as string;
  const valueType = formData.get("valueType") as string;
  const group = formData.get("group") as string;
  const unit = formData.get("unit") as string;

  if (!key || !value || !valueType) {
    return { error: "Key, value, and type are required" };
  }

  // Validate value type
  const validTypes = ["string", "number", "float", "integer", "boolean"];
  if (!validTypes.includes(valueType)) {
    return { error: "Invalid value type" };
  }

  // Validate value based on type
  if (valueType === "number" || valueType === "float") {
    const num = Number.parseFloat(value);
    if (isNaN(num)) {
      return { error: "Value must be a valid number" };
    }
  } else if (valueType === "integer") {
    const num = Number.parseInt(value, 10);
    if (isNaN(num)) {
      return { error: "Value must be a valid integer" };
    }
  } else if (valueType === "boolean") {
    if (value !== "true" && value !== "false") {
      return { error: "Value must be 'true' or 'false'" };
    }
  }

  try {
    await db.setting.create({
      data: {
        key: key.trim(),
        value: value.trim(),
        valueType: valueType as any,
        group: group?.trim() || "general",
        unit: unit?.trim() || null,
      },
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { error: "Setting with this key already exists" };
    }
    return { error: "Failed to create setting" };
  }
}

export async function updateSetting(formData: FormData) {
  const id = formData.get("id") as string;
  const key = formData.get("key") as string;
  const value = formData.get("value") as string;
  const valueType = formData.get("valueType") as string;
  const group = formData.get("group") as string;
  const unit = formData.get("unit") as string;

  if (!id || !key || !value || !valueType) {
    return { error: "ID, key, value, and type are required" };
  }

  // Validate value type
  const validTypes = ["string", "number", "float", "integer", "boolean"];
  if (!validTypes.includes(valueType)) {
    return { error: "Invalid value type" };
  }

  // Validate value based on type
  if (valueType === "number" || valueType === "float") {
    const num = Number.parseFloat(value);
    if (isNaN(num)) {
      return { error: "Value must be a valid number" };
    }
  } else if (valueType === "integer") {
    const num = Number.parseInt(value, 10);
    if (isNaN(num)) {
      return { error: "Value must be a valid integer" };
    }
  } else if (valueType === "boolean") {
    if (value !== "true" && value !== "false") {
      return { error: "Value must be 'true' or 'false'" };
    }
  }

  try {
    await db.setting.update({
      where: { id },
      data: {
        value: value.trim(),
        group: group?.trim() || "general",
        unit: unit?.trim() || null,
      },
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2025") {
      return { error: "Setting not found" };
    }
    return { error: "Failed to update setting" };
  }
}

export async function deleteSetting(settingId: string) {
  try {
    await db.setting.delete({
      where: { id: settingId },
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2025") {
      return { error: "Setting not found" };
    }
    return { error: "Failed to delete setting" };
  }
}

export async function resetCoreDefaults() {
  const defaults = [
    {
      key: "dev_releasable_hours_per_month",
      value: "100",
      valueType: "float" as const,
      group: "Assumptions",
      unit: "hours/month",
    },
    {
      key: "standard_hours_per_month",
      value: "160",
      valueType: "float" as const,
      group: "Assumptions",
      unit: "hours/month",
    },
    {
      key: "qa_ratio",
      value: "0.5",
      valueType: "float" as const,
      group: "Ratios",
      unit: "ratio",
    },
    {
      key: "ba_ratio",
      value: "0.25",
      valueType: "float" as const,
      group: "Ratios",
      unit: "ratio",
    },
  ];

  try {
    await db.$transaction(
      defaults.map((defaultSetting) =>
        db.setting.upsert({
          where: { key: defaultSetting.key },
          create: {
            key: defaultSetting.key,
            value: defaultSetting.value,
            valueType: defaultSetting.valueType,
            group: defaultSetting.group,
            unit: defaultSetting.unit,
          },
          update: {
            value: defaultSetting.value,
          },
        })
      )
    );

    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to reset core defaults" };
  }
}
