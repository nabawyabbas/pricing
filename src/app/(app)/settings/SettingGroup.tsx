"use client";

import { SettingInput } from "./SettingInput";
import { DeleteButton } from "./DeleteButton";
import { SETTINGS_METADATA } from "./settingsMetadata";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SettingGroupProps {
  groupName: string;
  settings: Array<{
    id: string;
    key: string;
    value: string;
    valueType: string;
    group: string;
    unit: string | null;
  }>;
}

export function SettingGroup({ groupName, settings }: SettingGroupProps) {
  if (settings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{groupName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground italic">No settings in this group.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{groupName}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Setting</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settings.map((setting) => {
              const metadata = SETTINGS_METADATA[setting.key];
              const label = metadata?.label || setting.key;
              const description = metadata?.description || "";
              const inputType = metadata?.inputType || "text";

              return (
                <TableRow key={setting.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{label}</div>
                      <code className="text-xs text-muted-foreground">{setting.key}</code>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {description || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <SettingInput setting={setting} inputType={inputType} />
                  </TableCell>
                  <TableCell>{setting.unit || "-"}</TableCell>
                  <TableCell className="text-center">
                    <DeleteButton settingId={setting.id} settingKey={setting.key} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
