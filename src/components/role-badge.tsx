import { ROLE_LABELS, type UserRole } from "@/types/roles";

const ROLE_STYLES: Record<UserRole, string> = {
  owner: "border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-300",
  admin: "border-cyan/30 bg-cyan/10 text-cyan",
  member: "border-ink2/20 bg-ink2/5 text-ink2",
};

export function RoleBadge({ role }: { role: UserRole }) {
  const label = ROLE_LABELS[role];

  return (
    <span
      className={[
        "inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]",
        ROLE_STYLES[role],
      ].join(" ")}
      aria-label={`Role: ${label.charAt(0) + label.slice(1).toLowerCase()}`}
    >
      {label}
    </span>
  );
}
