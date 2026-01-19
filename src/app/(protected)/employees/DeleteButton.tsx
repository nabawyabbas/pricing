"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteEmployee } from "./actions";
import { DeleteButtonWithConfirm } from "@/components/DeleteButtonWithConfirm";
import { showToast } from "@/lib/toast";

export function DeleteButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleDelete(formData: FormData) {
    startTransition(async () => {
      const result = await deleteEmployee(formData);
      if (result?.error) {
        showToast(result.error, "error");
      } else {
        showToast(`Employee "${name}" deleted successfully`, "success");
        router.refresh();
      }
    });
  }

  return (
    <DeleteButtonWithConfirm
      id={id}
      name={name}
      onDelete={handleDelete}
      itemType="Employee"
      disabled={isPending}
    />
  );
}
