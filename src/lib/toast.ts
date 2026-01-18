"use client";

export type ToastType = "success" | "error" | "info";

let toastListeners: Array<(message: string, type: ToastType) => void> = [];

export function subscribeToToasts(listener: (message: string, type: ToastType) => void) {
  toastListeners.push(listener);
  return () => {
    toastListeners = toastListeners.filter((l) => l !== listener);
  };
}

export function showToast(message: string, type: ToastType = "info") {
  toastListeners.forEach((listener) => listener(message, type));
}


