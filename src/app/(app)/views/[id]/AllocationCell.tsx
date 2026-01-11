"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPercent } from "@/lib/format";
import { setAllocationOverride } from "../actions";
import { toast } from "sonner";

interface AllocationCellProps {
  viewId: string;
  employeeId: string;
  overheadTypeId: string;
  baseShare: number | undefined;
  overrideShare: number | undefined;
}

export function AllocationCell({
  viewId,
  employeeId,
  overheadTypeId,
  baseShare,
  overrideShare,
}: AllocationCellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [editingValue, setEditingValue] = useState<string>("");

  const effectiveShare = overrideShare ?? baseShare ?? 0;
  const isOverridden = overrideShare !== undefined;

  const handleSave = () => {
    const newShare = Number.parseFloat(editingValue) / 100;
    if (isNaN(newShare) || newShare < 0 || newShare > 1) {
      toast.error("Share must be between 0% and 100%");
      return;
    }

    startTransition(async () => {
      const result = await setAllocationOverride(viewId, employeeId, overheadTypeId, newShare);
      if (result.success) {
        toast.success("Allocation override updated");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update override");
      }
      setIsEditing(false);
      setEditingValue("");
    });
  };

  const handleReset = () => {
    startTransition(async () => {
      const result = await setAllocationOverride(viewId, employeeId, overheadTypeId, null);
      if (result.success) {
        toast.success("Allocation override reverted");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to revert override");
      }
    });
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          className="w-20"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSave();
            } else if (e.key === "Escape") {
              setIsEditing(false);
              setEditingValue("");
            }
          }}
          autoFocus
        />
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setIsEditing(false);
            setEditingValue("");
          }}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <div className="text-right">
        {baseShare !== undefined && (
          <div className="text-xs text-muted-foreground">
            Base: {formatPercent(baseShare, "decimal", 2)}
          </div>
        )}
        <div className="font-medium">{formatPercent(effectiveShare, "decimal", 2)}</div>
      </div>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setEditingValue((effectiveShare * 100).toString());
            setIsEditing(true);
          }}
          disabled={isPending}
        >
          Edit
        </Button>
        {isOverridden && (
          <Button size="sm" variant="ghost" onClick={handleReset} disabled={isPending}>
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}

