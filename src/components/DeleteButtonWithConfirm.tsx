"use client";

import { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

interface DeleteButtonWithConfirmProps {
  id: string;
  name: string;
  onDelete: (formData: FormData) => Promise<void>;
  itemType?: string;
  disabled?: boolean;
}

export function DeleteButtonWithConfirm({
  id,
  name,
  onDelete,
  itemType = "item",
  disabled = false,
}: DeleteButtonWithConfirmProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    const formData = new FormData();
    formData.set("id", id);
    await onDelete(formData);
    setShowConfirm(false);
    setIsDeleting(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={isDeleting || disabled}
        style={{
          padding: "0.4rem 1rem",
          fontSize: "0.9rem",
          backgroundColor: "#dc3545",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: isDeleting || disabled ? "not-allowed" : "pointer",
          opacity: isDeleting || disabled ? 0.6 : 1,
        }}
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>
      <ConfirmDialog
        isOpen={showConfirm}
        title={`Delete ${itemType}`}
        message={`Are you sure you want to delete "${name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
        variant="danger"
      />
    </>
  );
}

