"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTechStack } from "./actions";
import { showToast } from "@/lib/toast";

export function StacksForm() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const result = await createTechStack(formData);
      if (result?.error) {
        showToast(result.error, "error");
      } else {
        showToast("Tech stack created successfully", "success");
        e.currentTarget.reset();
        router.refresh();
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginBottom: "2rem",
        padding: "1.5rem",
        border: "1px solid #ddd",
        borderRadius: "8px",
        backgroundColor: "#f9f9f9",
      }}
    >
      <h2 style={{ marginBottom: "1rem" }}>Create New Tech Stack</h2>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label
            htmlFor="name"
            style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
          >
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            disabled={isPending}
            style={{
              width: "100%",
              padding: "0.5rem",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              opacity: isPending ? 0.6 : 1,
            }}
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: "0.5rem 1.5rem",
            fontSize: "1rem",
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isPending ? "not-allowed" : "pointer",
            fontWeight: "500",
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? "Creating..." : "Create"}
        </button>
      </div>
    </form>
  );
}

