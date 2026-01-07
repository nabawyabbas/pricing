"use client";

import { useState } from "react";
import { deleteSetting } from "./actions";

interface DeleteButtonProps {
  settingId: string;
}

export function DeleteButton({ settingId }: DeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this setting?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteSetting(settingId);
    } catch (error) {
      alert("Failed to delete setting");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      style={{
        padding: "0.25rem 0.5rem",
        fontSize: "0.85rem",
        backgroundColor: "#dc3545",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: isDeleting ? "not-allowed" : "pointer",
        opacity: isDeleting ? 0.6 : 1,
      }}
    >
      {isDeleting ? "..." : "Delete"}
    </button>
  );
}

