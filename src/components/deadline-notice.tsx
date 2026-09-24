"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_TIMEOUT_MS = 2_147_483_647;

export function DeadlineNotice({ deadline }: { deadline: string }) {
  const router = useRouter();
  const [formatted, setFormatted] = useState("");

  useEffect(() => {
    const date = new Date(deadline);
    if (Number.isNaN(date.getTime())) return;

    setFormatted(
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)
    );

    const remaining = date.getTime() - Date.now();
    if (remaining <= 0 || remaining > MAX_TIMEOUT_MS) return;

    const timer = window.setTimeout(() => {
      router.refresh();
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [deadline, router]);

  return (
    <div
      className="mb-4 rounded-xl border border-line bg-panel2/60 px-4 py-3 text-sm text-ink2"
      role="status"
      aria-live="polite"
    >
      Submissions close {formatted || "at the deadline"}.
    </div>
  );
}
