"use client";

export function RetryMembershipButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="mt-5 inline-flex h-10 items-center justify-center rounded-md border border-line bg-panel2 px-4 text-sm font-medium text-ink transition hover:border-orange/50 hover:text-orange"
    >
      Try again
    </button>
  );
}
