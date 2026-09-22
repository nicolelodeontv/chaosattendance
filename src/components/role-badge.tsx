import { ROLE_LABELS, type UserRole } from "@/types/roles";

const ROLE_MODIFIERS: Record<UserRole, string> = {
  owner: "role-badge--owner",
  admin: "role-badge--admin",
  member: "role-badge--member",
};

export function RoleBadge({ variant }: { variant: UserRole }) {
  const label = ROLE_LABELS[variant];
  const readableLabel = label.charAt(0) + label.slice(1).toLowerCase();

  return (
    <span
      className={[
        "role-badge inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em]",
        ROLE_MODIFIERS[variant],
      ].join(" ")}
      aria-label={`Role: ${readableLabel}`}
    >
      {label}
    </span>
  );
}
