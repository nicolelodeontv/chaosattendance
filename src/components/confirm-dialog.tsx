"use client";

import { useRef, type ReactNode } from "react";
import { BaseModal } from "@/components/modal";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <BaseModal
      open={open}
      title={title}
      titleId="confirm-dialog-title"
      message={message}
      messageId="confirm-dialog-message"
      onClose={onCancel}
      initialFocusRef={cancelRef}
      role="alertdialog"
      closeOnEscape={!loading}
      closeOnBackdrop={!loading}
      footer={
        <>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="premium-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={[
              "inline-flex min-h-[42px] items-center justify-center rounded-[10px] border px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              variant === "danger"
                ? "border-red/70 bg-red/15 text-red hover:border-red hover:bg-red/20"
                : "border-cyan/70 bg-cyan/12 text-cyan hover:border-cyan hover:bg-cyan/18",
            ].join(" ")}
          >
            {loading ? (
              <>
                <span
                  className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden="true"
                />
                {confirmLabel}
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </>
      }
    />
  );
}
