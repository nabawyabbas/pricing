"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingGroup } from "./SettingGroup";
import { SettingsForm } from "./SettingsForm";

interface SettingsTabsProps {
  settings: Array<{
    id: string;
    key: string;
    value: string;
    valueType: string;
    group: string;
    unit: string | null;
  }>;
}

// Group order for display
const GROUP_ORDER = ["Assumptions", "Ratios", "Pricing", "general"];

export function SettingsTabs({ settings }: SettingsTabsProps) {
  // Group settings
  const groupedSettings = new Map<string, typeof settings>();
  settings.forEach((setting) => {
    const group = setting.group || "general";
    if (!groupedSettings.has(group)) {
      groupedSettings.set(group, []);
    }
    groupedSettings.get(group)!.push(setting);
  });

  // Get all groups and sort by predefined order
  const allGroups = Array.from(groupedSettings.keys());
  const sortedGroups = allGroups.sort((a, b) => {
    const indexA = GROUP_ORDER.indexOf(a) === -1 ? 999 : GROUP_ORDER.indexOf(a);
    const indexB = GROUP_ORDER.indexOf(b) === -1 ? 999 : GROUP_ORDER.indexOf(b);
    return indexA - indexB;
  });

  // Default tab is first group or "Assumptions"
  const defaultTab = sortedGroups.includes("Assumptions")
    ? "Assumptions"
    : sortedGroups[0] || "Assumptions";

  if (sortedGroups.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 border rounded-md">
        No settings found. Use "Reset Core Defaults" to create default settings.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${sortedGroups.length}, 1fr)` }}>
          {sortedGroups.map((groupName) => (
            <TabsTrigger key={groupName} value={groupName}>
              {groupName}
            </TabsTrigger>
          ))}
        </TabsList>
        {sortedGroups.map((groupName) => (
          <TabsContent key={groupName} value={groupName} className="mt-6">
            <SettingGroup groupName={groupName} settings={groupedSettings.get(groupName) || []} />
          </TabsContent>
        ))}
      </Tabs>

      {/* Create New Setting */}
      <SettingsForm />
    </div>
  );
}

