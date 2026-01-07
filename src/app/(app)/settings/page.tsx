import { db } from "@/lib/db";
import { SettingsTabs } from "./SettingsTabs";
import { SETTINGS_METADATA, REQUIRED_SETTINGS } from "./settingsMetadata";
import { ResetDefaultsButton } from "./ResetDefaultsButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

async function getSettings() {
  return await db.setting.findMany({
    orderBy: [{ group: "asc" }, { key: "asc" }],
  });
}

export default async function SettingsPage() {
  const settings = await getSettings();
  const settingsByKey = new Map(settings.map((s) => [s.key, s]));

  // Check for missing required settings
  const missingRequired = REQUIRED_SETTINGS.filter((key) => !settingsByKey.has(key));

  return (
    <div className="space-y-6">
      {/* Missing Required Settings Warning */}
      {missingRequired.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Missing Required Settings
            </CardTitle>
            <CardDescription>
              The following required settings are missing. Please add them or use "Reset Core
              Defaults" to create them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {missingRequired.map((key) => {
                const metadata = SETTINGS_METADATA[key];
                return (
                  <li key={key} className="text-sm">
                    <strong>{metadata?.label || key}</strong> ({key})
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Reset Core Defaults */}
      <ResetDefaultsButton />

      {/* Settings Tabs */}
      <SettingsTabs settings={settings} />
    </div>
  );
}
