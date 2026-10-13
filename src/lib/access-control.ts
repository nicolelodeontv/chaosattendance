export type AccessLevel = "owner" | "manager" | "admin";
export type AdminTab = "submissions" | "recentlyRemoved" | "roster" | "settings" | "access";

const TAB_ACCESS: Record<AdminTab, readonly AccessLevel[]> = {
  submissions: ["owner", "manager", "admin"],
  recentlyRemoved: ["owner", "manager", "admin"],
  roster: ["owner", "manager", "admin"],
  settings: ["owner", "manager"],
  access: ["owner"],
};

export function canAccessTab(
  level: AccessLevel | null | undefined,
  tab: AdminTab
): boolean {
  return Boolean(level && TAB_ACCESS[tab].includes(level));
}

export function isAdminTab(value: unknown): value is AdminTab {
  return typeof value === "string" && [
    "submissions",
    "recentlyRemoved",
    "roster",
    "settings",
    "access",
  ].includes(value);
}
