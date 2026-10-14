"use client";

import { useEffect, useRef } from "react";

export type ToastItem = {
  id: string;
  message: string;
  variant?: "success" | "error";
};

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const timer = window.setTimeout(() => onDismissRef.current(toast.id), 3000);
    return () => window.clearTimeout(timer);
  }, [toast.id]);

  const isError = toast.variant === "error";

  return (
    <div
      className={[
        "toast-item rounded-md border bg-panel px-4 py-3 text-sm shadow-xl",
        isError ? "border-red/30 text-red" : "border-cyan/30 text-cyan",
      ].join(" ")}
      role={isError ? "alert" : "status"}
    >
      {toast.message}
    </div>
  );
}
