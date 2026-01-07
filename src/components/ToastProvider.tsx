"use client";

import { useState, useEffect } from "react";
import { Toast } from "./Toast";
import { subscribeToToasts, type ToastType } from "@/lib/toast";

interface ToastState {
  id: string;
  message: string;
  type: ToastType;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToToasts((message, type) => {
      const id = Math.random().toString(36).substring(7);
      setToasts((prev) => [...prev, { id, message, type }]);
    });

    return unsubscribe;
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      {children}
      <div style={{ position: "fixed", top: 0, right: 0, zIndex: 10000, pointerEvents: "none", padding: "1rem" }}>
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            style={{
              pointerEvents: "auto",
              marginBottom: "0.5rem",
              transform: `translateY(${index * 80}px)`,
            }}
          >
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </>
  );
}
