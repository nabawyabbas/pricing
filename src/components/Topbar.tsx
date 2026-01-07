"use client";

import { useState } from "react";

interface TopbarProps {
  title: string;
  actions?: React.ReactNode;
  onMenuToggle?: (open: boolean) => void;
}

export function Topbar({ title, actions, onMenuToggle }: TopbarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuToggle = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    onMenuToggle?.(newState);
  };

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 997,
          backgroundColor: "white",
          borderBottom: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.5rem",
            gap: "1rem",
          }}
        >
          {/* Mobile menu button */}
          <button
            onClick={handleMenuToggle}
            style={{
              display: "block",
              padding: "0.5rem",
              backgroundColor: "transparent",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            className="md:hidden"
            aria-label="Toggle menu"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>

          <h1 style={{ fontSize: "1.5rem", fontWeight: "600", margin: 0, flex: 1 }}>{title}</h1>

          {actions && <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>{actions}</div>}
        </div>

        {/* Active items banner */}
        <div
          style={{
            padding: "0.5rem 1.5rem",
            backgroundColor: "#fef3c7",
            borderTop: "1px solid #fde68a",
            fontSize: "0.875rem",
            color: "#92400e",
          }}
        >
          <span style={{ fontWeight: "500" }}>ℹ️ Calculations include ACTIVE items only</span>
        </div>
      </header>
    </>
  );
}

