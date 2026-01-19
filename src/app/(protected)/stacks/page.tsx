import { db } from "@/lib/db";
import { createTechStack } from "./actions";
import { DeleteButton } from "./DeleteButton";
import { EmptyState } from "@/components/EmptyState";
import { StacksForm } from "./StacksForm";

async function getTechStacks() {
  return await db.techStack.findMany({
    orderBy: { name: "asc" },
  });
}

export default async function StacksPage() {
  const stacks = await getTechStacks();

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <StacksForm />

      <div>
        <h2 style={{ marginBottom: "1rem" }}>Existing Tech Stacks</h2>
        {stacks.length === 0 ? (
          <EmptyState
            title="No Tech Stacks Yet"
            message="Get started by creating your first tech stack. Tech stacks help organize your development teams."
            actionLabel="Create Tech Stack"
            onAction={() => {
              if (typeof window !== "undefined") {
                document.querySelector('input[name="name"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
                (document.querySelector('input[name="name"]') as HTMLInputElement)?.focus();
              }
            }}
            icon="⚙️"
          />
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
