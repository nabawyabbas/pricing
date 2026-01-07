"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTechStack } from "./actions";
import { DeleteButtonWithConfirm } from "@/components/DeleteButtonWithConfirm";
import { showToast } from "@/lib/toast";

export function DeleteButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleDelete(formData: FormData) {
    startTransition(async () => {
      const result = await deleteTechStack(formData);
      if (result?.error) {
        showToast(result.error, "error");
      } else {
        showToast(`Tech stack "${name}" deleted successfully`, "success");
        router.refresh();
      }
    });
  }

  return (
    <DeleteButtonWithConfirm
      id={id}
      name={name}
      onDelete={handleDelete}
      itemType="Tech Stack"
      disabled={isPending}
    />
  );
}
