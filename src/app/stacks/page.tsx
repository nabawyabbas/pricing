import { db } from "@/lib/db";
import { createTechStack } from "./actions";
import { DeleteButton } from "./DeleteButton";

async function getTechStacks() {
  return await db.techStack.findMany({
    orderBy: { name: "asc" },
  });
}

async function handleCreate(formData: FormData) {
  "use server";
  await createTechStack(formData);
}

export default async function StacksPage() {
  const stacks = await getTechStacks();

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ marginBottom: "2rem" }}>Tech Stacks</h1>

      <form
        action={handleCreate}
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
              style={{
                width: "100%",
                padding: "0.5rem",
                fontSize: "1rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: "0.5rem 1.5rem",
              fontSize: "1rem",
              backgroundColor: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Create
          </button>
        </div>
      </form>

      <div>
        <h2 style={{ marginBottom: "1rem" }}>Existing Tech Stacks</h2>
        {stacks.length === 0 ? (
          <p style={{ color: "#666", fontStyle: "italic" }}>
            No tech stacks yet. Create one above.
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {stacks.map((stack) => (
              <StackItem key={stack.id} stack={stack} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StackItem({ stack }: { stack: { id: string; name: string } }) {
  return (
    <li
      style={{
        padding: "1rem",
        marginBottom: "0.5rem",
        border: "1px solid #ddd",
        borderRadius: "4px",
        backgroundColor: "white",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: "1rem" }}>{stack.name}</span>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <DeleteButton id={stack.id} name={stack.name} />
      </div>
    </li>
  );
}

