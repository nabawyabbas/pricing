"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { updateSetting } from "./actions";
import { toast } from "sonner";

interface SettingInputProps {
  setting: {
    id: string;
    key: string;
    value: string;
    valueType: string;
    group: string;
    unit: string | null;
  };
  inputType: "number" | "percent" | "money" | "text";
}

export function SettingInput({ setting, inputType }: SettingInputProps) {
  // For percent inputs, store the display value (percentage) in state, convert on submit
  const getInitialDisplayValue = () => {
    if (inputType === "percent") {
      const num = Number.parseFloat(setting.value);
      if (!isNaN(num)) {
        return (num * 100).toFixed(2);
      }
      return "";
    }
    return setting.value;
  };

  const [displayValue, setDisplayValue] = useState(getInitialDisplayValue());
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Convert input value back to stored format
  const getStoredValue = (inputValue: string): string => {
    if (inputType === "percent") {
      const num = Number.parseFloat(inputValue);
      if (!isNaN(num)) {
        return (num / 100).toString();
      }
      return setting.value; // Keep current value if invalid
    }
    return inputValue;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    setIsEditing(true);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout to submit after user stops typing
    timeoutRef.current = setTimeout(() => {
      submitValue(inputValue);
    }, 1000);
  };

  const handleBlur = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    submitValue(displayValue);
    setIsEditing(false);
  };

  async function submitValue(inputValue: string) {
    const storedValue = getStoredValue(inputValue);
    if (storedValue === setting.value) {
      setIsEditing(false);
      return;
    }

    // Validation
    if (inputType === "number" || inputType === "money") {
      const num = Number.parseFloat(inputValue);
      if (isNaN(num) || num < 0) {
        toast.error("Value must be a valid positive number");
        setDisplayValue(getInitialDisplayValue());
        setIsEditing(false);
        return;
      }
    } else if (inputType === "percent") {
      const num = Number.parseFloat(inputValue);
      if (isNaN(num) || num < 0 || num > 100) {
        toast.error("Percentage must be between 0 and 100");
        setDisplayValue(getInitialDisplayValue());
        setIsEditing(false);
        return;
      }
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", setting.id);
      formData.set("key", setting.key);
      formData.set("value", storedValue);
      formData.set("valueType", setting.valueType);
      formData.set("group", setting.group);
      formData.set("unit", setting.unit ?? "");

      const result = await updateSetting(formData);
      if (result?.error) {
        toast.error(result.error);
        setDisplayValue(getInitialDisplayValue());
      } else {
        toast.success(`Setting "${setting.key}" updated successfully`);
        router.refresh();
      }
      setIsEditing(false);
    });
  }

  const inputProps = {
    type: inputType === "number" || inputType === "percent" || inputType === "money" ? "number" : "text",
    step: inputType === "percent" || inputType === "money" ? "0.01" : inputType === "number" ? "1" : undefined,
    min: inputType === "percent" ? "0" : inputType === "number" || inputType === "money" ? "0" : undefined,
    max: inputType === "percent" ? "100" : undefined,
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        {...inputProps}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={() => setIsEditing(true)}
        className={`w-24 ${isEditing ? "ring-2 ring-blue-500" : ""}`}
        placeholder={inputType === "percent" ? "0.00" : ""}
        disabled={isPending}
      />
      {inputType === "percent" && <span className="text-sm text-muted-foreground">%</span>}
      {inputType === "money" && setting.key === "exchange_ratio" && (
        <span className="text-sm text-muted-foreground">EGP/USD</span>
      )}
    </div>
  );
}
