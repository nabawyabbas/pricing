"use client";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "warning" | "info";
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = "danger",
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantColors = {
    danger: { bg: "#dc3545", hover: "#c82333", text: "white" },
    warning: { bg: "#ffc107", hover: "#e0a800", text: "#000" },
    info: { bg: "#0070f3", hover: "#0051cc", text: "white" },
  };

  const colors = variantColors[variant];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "1rem",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "1.5rem",
          maxWidth: "400px",
          width: "100%",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: "0.5rem", fontSize: "1.25rem", fontWeight: "600" }}>{title}</h3>
        <p style={{ marginBottom: "1.5rem", color: "#666" }}>{message}</p>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.9rem",
              backgroundColor: "#f8f9fa",
              color: "#333",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.9rem",
              backgroundColor: colors.bg,
              color: colors.text,
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "500",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.bg;
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

