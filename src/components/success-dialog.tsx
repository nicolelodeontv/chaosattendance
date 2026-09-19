"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { BaseModal } from "@/components/modal";

export const SUCCESS_DIALOG_AUTO_CLOSE_MS = 5000;

export function SuccessDialog({
  open,
  title,
  message,
  onClose,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  onClose: () => void;
}) {
  const okRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => onCloseRef.current(), SUCCESS_DIALOG_AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <BaseModal
      open={open}
      title={title}
      titleId="success-dialog-title"
      message={message}
      messageId="success-dialog-message"
      onClose={onClose}
      initialFocusRef={okRef}
    >
      <div className="mt-6 flex justify-center" aria-hidden="true">
        <div className="success-dialog-icon flex h-16 w-16 items-center justify-center rounded-full border border-cyan/30 bg-cyan/10 text-cyan">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 12 4 4 8-8" />
          </svg>
        </div>
      </div>

      <div className="mt-6">
        <button
          ref={okRef}
          type="button"
          onClick={onClose}
          className="premium-button w-full"
        >
          OK
        </button>
      </div>
    </BaseModal>
  );
}
