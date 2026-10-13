export type UserRole = "owner" | "manager" | "admin" | "member";

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: "OWNER",
  admin: "ADMIN",
  manager: "MANAGER",
  member: "MEMBER",
};
