"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSetting } from "./actions";
import { DeleteButtonWithConfirm } from "@/components/DeleteButtonWithConfirm";
import { toast } from "sonner";

interface DeleteButtonProps {
  settingId: string;
  settingKey: string;
}

export function DeleteButton({ settingId, settingKey }: DeleteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleDelete(formData: FormData) {
    startTransition(async () => {
      const result = await deleteSetting(settingId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`Setting "${settingKey}" deleted successfully`);
        router.refresh();
      }
    });
  }

  return (
    <DeleteButtonWithConfirm
      id={settingId}
      name={settingKey}
      onDelete={handleDelete}
      itemType="Setting"
      disabled={isPending}
    />
  );
}
