"use client";

import { deleteTechStack } from "./actions";

export function DeleteButton({ id, name }: { id: string; name: string }) {
  async function handleDelete(formData: FormData) {
    await deleteTechStack(formData);
  }

  return (
    <form action={handleDelete}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        onClick={(e) => {
          if (!confirm(`Are you sure you want to delete "${name}"?`)) {
            e.preventDefault();
          }
        }}
        style={{
          padding: "0.4rem 1rem",
          fontSize: "0.9rem",
          backgroundColor: "#dc3545",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Delete
      </button>
    </form>
  );
}

