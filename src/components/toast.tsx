"use client";

import { useEffect, useRef } from "react";

export type ToastItem = {
  id: string;
  message: string;
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

  return (
    <div className="toast-item rounded-md border border-cyan/30 bg-panel px-4 py-3 text-sm text-cyan shadow-xl" role="status">
      {toast.message}
    </div>
  );
}
