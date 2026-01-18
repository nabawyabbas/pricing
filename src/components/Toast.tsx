"use client";

import { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const colors = {
    success: { bg: "#d4edda", border: "#c3e6cb", text: "#155724" },
    error: { bg: "#f8d7da", border: "#f5c6cb", text: "#721c24" },
    info: { bg: "#d1ecf1", border: "#bee5eb", text: "#0c5460" },
  };

  const color = colors[type];

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        padding: "1rem 1.5rem",
        backgroundColor: color.bg,
        border: `1px solid ${color.border}`,
        borderRadius: "8px",
        color: color.text,
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        zIndex: 10000,
        minWidth: "300px",
        maxWidth: "500px",
        animation: "slideIn 0.3s ease-out",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        <div style={{ flex: 1 }}>
          <strong>{type === "success" ? "✓" : type === "error" ? "✕" : "ℹ"}</strong> {message}
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: color.text,
            cursor: "pointer",
            fontSize: "1.2rem",
            padding: "0",
            lineHeight: "1",
            opacity: 0.7,
          }}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}


