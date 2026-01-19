"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { LogOut } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/stacks", label: "Stacks" },
  { href: "/employees", label: "Employees" },
  { href: "/overheads", label: "Overheads" },
  { href: "/settings", label: "Settings" },
  { href: "/results", label: "Results" },
  { href: "/admin/users", label: "Users" },
];

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      setLoggingOut(false);
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 998,
            display: "block",
          }}
          className="md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width: "250px",
          backgroundColor: "#1f2937",
          color: "white",
          zIndex: 999,
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease-in-out",
          overflowY: "auto",
        }}
        className="md:translate-x-0"
      >
        <div style={{ padding: "1.5rem" }}>
          <div style={{ marginBottom: "2rem" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>Pricing App</h1>
          </div>

          <nav>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href} style={{ marginBottom: "0.5rem" }}>
                    <Link
                      href={item.href}
                      onClick={() => {
                        // Close sidebar on mobile when link is clicked
                        if (window.innerWidth < 768) {
                          onClose();
                        }
                      }}
                      style={{
                        display: "block",
                        padding: "0.75rem 1rem",
                        borderRadius: "6px",
                        textDecoration: "none",
                        color: isActive ? "white" : "#d1d5db",
                        backgroundColor: isActive ? "#3b82f6" : "transparent",
                        fontWeight: isActive ? "600" : "400",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "#374151";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Logout button at bottom */}
          <div style={{ marginTop: "2rem", paddingTop: "2rem", borderTop: "1px solid #374151" }}>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                width: "100%",
                padding: "0.75rem 1rem",
                borderRadius: "6px",
                backgroundColor: "transparent",
                color: "#d1d5db",
                border: "1px solid #374151",
                cursor: loggingOut ? "not-allowed" : "pointer",
                opacity: loggingOut ? 0.6 : 1,
                fontSize: "0.875rem",
                fontWeight: "500",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!loggingOut) {
                  e.currentTarget.style.backgroundColor = "#374151";
                  e.currentTarget.style.color = "white";
                }
              }}
              onMouseLeave={(e) => {
                if (!loggingOut) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#d1d5db";
                }
              }}
            >
              <LogOut size={16} />
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}


