"use client";

import { useState } from "react";
import { BaseModal } from "@/components/modal";

export function SignOutButton({ action }: { action: () => Promise<void> }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="premium-button-secondary h-8 !min-h-8 shrink-0 whitespace-nowrap px-3 py-0 text-xs"
      >
        Sign out
      </button>

      <BaseModal
        open={open}
        title="Sign out?"
        titleId="sign-out-dialog-title"
        message="You'll need to sign in with Discord again to report attendance."
        messageId="sign-out-dialog-message"
        onClose={() => setOpen(false)}
        cardClassName="max-w-[380px] !px-8 !pb-8 !pt-10 text-center"
        closeOnEscape
        closeOnBackdrop
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="premium-button-secondary min-h-[42px] rounded-[10px] px-4 text-sm font-semibold"
            >
              Cancel
            </button>
            <form action={action}>
              <button
                type="submit"
                className="inline-flex min-h-[42px] items-center justify-center rounded-[10px] border border-red/70 bg-red text-ink px-4 text-sm font-semibold transition-colors hover:border-red hover:bg-red/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red/30"
              >
                Sign out
              </button>
            </form>
          </>
        }
      />
    </>
  );
}
