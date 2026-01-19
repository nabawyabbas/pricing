interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
}

export function EmptyState({ title, message, actionLabel, onAction, icon = "📋" }: EmptyStateProps) {
  return (
    <div
      style={{
        padding: "3rem 2rem",
        textAlign: "center",
        backgroundColor: "#f9f9f9",
        border: "1px solid #ddd",
        borderRadius: "8px",
      }}
    >
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{icon}</div>
      <h3 style={{ marginBottom: "0.5rem", fontSize: "1.25rem", fontWeight: "600", color: "#333" }}>
        {title}
      </h3>
      <p style={{ marginBottom: actionLabel ? "1.5rem" : "0", color: "#666", maxWidth: "400px", margin: "0 auto 1.5rem" }}>
        {message}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "500",
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}



