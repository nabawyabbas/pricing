"use client";

import { useState, useRef, useEffect } from "react";
import { updateOverheadAllocation } from "./actions";

interface AllocationInputProps {
  employeeId: string;
  field: "mgmtShare" | "companyShare";
  defaultValue: number;
  otherFieldValue: number;
}

export function AllocationInput({
  employeeId,
  field,
  defaultValue,
  otherFieldValue,
}: AllocationInputProps) {
  const [value, setValue] = useState(defaultValue.toString());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setValue(defaultValue.toString());
  }, [defaultValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout to submit after user stops typing
    timeoutRef.current = setTimeout(() => {
      if (formRef.current) {
        formRef.current.requestSubmit();
      }
    }, 1000);
  };

  const handleBlur = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  async function handleSubmit(formData: FormData) {
    const mgmtShare = field === "mgmtShare" ? value : otherFieldValue.toString();
    const companyShare = field === "companyShare" ? value : otherFieldValue.toString();

    formData.set("mgmtShare", mgmtShare);
    formData.set("companyShare", companyShare);
    await updateOverheadAllocation(formData);
  }

  return (
    <form ref={formRef} action={handleSubmit}>
      <input type="hidden" name="employeeId" value={employeeId} />
      <input
        type="number"
        name={field}
        step="0.0001"
        min="0"
        max="1"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        style={{
          width: "80px",
          padding: "0.25rem",
          fontSize: "0.9rem",
          border: "1px solid #ccc",
          borderRadius: "4px",
          textAlign: "center",
        }}
        placeholder="0.0000"
      />
    </form>
  );
}

