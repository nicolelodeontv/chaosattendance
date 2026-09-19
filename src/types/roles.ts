export type UserRole = "owner" | "admin" | "member";

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: "OWNER",
  admin: "ADMIN",
  member: "MEMBER",
};
