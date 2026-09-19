import { prisma } from "./prisma";
import type { UserRole } from "@/types/roles";

type OwnerUser = {
  discordId?: string | null;
};

function normalizeOwnerId(value: string | undefined | null): string {
  return (value ?? "")
    .trim()
    .replace(/^[\"']+|[\"']+$/g, "")
    .trim();
}

/**
 * The OWNER_DISCORD_ID from env is always an admin, regardless of what's in
 * the database. This guarantees you can never lock yourself out of the
 * admin panel even if the AdminUser table is empty or gets wiped.
 */
export async function isAdmin(discordId: string | undefined | null): Promise<boolean> {
  if (!discordId) return false;
  if (isOwner({ discordId })) return true;

  const admin = await prisma.adminUser.findUnique({ where: { discordId } });
  return !!admin;
}

export function isOwner(user: OwnerUser | null | undefined): boolean {
  const ownerId = normalizeOwnerId(process.env.OWNER_DISCORD_ID);
  const discordId = user?.discordId?.trim() ?? "";
  return Boolean(ownerId && discordId && discordId === ownerId);
}

export async function getRole(
  discordId: string | undefined | null,
  adminDiscordIds?: ReadonlySet<string>
): Promise<UserRole> {
  const normalizedDiscordId = discordId?.trim() ?? "";
  if (!normalizedDiscordId) return "member";

  if (isOwner({ discordId: normalizedDiscordId })) return "owner";

  const ids = adminDiscordIds ?? new Set(
    (await prisma.adminUser.findMany({ select: { discordId: true } })).map((admin) => admin.discordId.trim())
  );

  return ids.has(normalizedDiscordId) ? "admin" : "member";
}
