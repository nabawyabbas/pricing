/**
 * Helper functions for computing effective settings with view overrides
 */

import { db } from "./db";
import { type Settings } from "./pricing";

/**
 * Get effective settings for a view (merged global + overrides)
 * If viewId is null/undefined, returns only global settings
 */
export async function getEffectiveSettings(viewId: string | null | undefined): Promise<Settings> {
  // Load global settings
  const globalSettings = await db.setting.findMany();
  const globalMap: Settings = {};
  globalSettings.forEach((setting) => {
    if (setting.valueType === "float" || setting.valueType === "number") {
      globalMap[setting.key] = Number.parseFloat(setting.value);
    } else if (setting.valueType === "integer") {
      globalMap[setting.key] = Number.parseInt(setting.value, 10);
    } else if (setting.valueType === "boolean") {
      globalMap[setting.key] = setting.value === "true" ? 1 : 0;
    } else {
      const parsed = Number.parseFloat(setting.value);
      globalMap[setting.key] = isNaN(parsed) ? 0 : parsed;
    }
  });

  // If no viewId, return only global settings
  if (!viewId) {
    return globalMap;
  }

  // Load setting overrides for the view
  const overrides = await db.settingOverride.findMany({
    where: { viewId },
  });

  // Merge overrides into global settings
  const effectiveSettings = { ...globalMap };
  overrides.forEach((override) => {
    if (override.valueType === "float" || override.valueType === "number") {
      effectiveSettings[override.key] = Number.parseFloat(override.value);
    } else if (override.valueType === "integer") {
      effectiveSettings[override.key] = Number.parseInt(override.value, 10);
    } else if (override.valueType === "boolean") {
      effectiveSettings[override.key] = override.value === "true" ? 1 : 0;
    } else {
      const parsed = Number.parseFloat(override.value);
      effectiveSettings[override.key] = isNaN(parsed) ? 0 : parsed;
    }
  });

  return effectiveSettings;
}


