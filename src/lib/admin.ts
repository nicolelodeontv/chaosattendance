import { prisma } from "./prisma";

/**
 * The OWNER_DISCORD_ID from env is always an admin, regardless of what's in
 * the database. This guarantees you can never lock yourself out of the
 * admin panel even if the AdminUser table is empty or gets wiped.
 */
export async function isAdmin(discordId: string | undefined | null): Promise<boolean> {
  if (!discordId) return false;
  if (discordId === process.env.OWNER_DISCORD_ID) return true;

  const admin = await prisma.adminUser.findUnique({ where: { discordId } });
  return !!admin;
}

type OwnerUser = {
  discordId?: string | null;
};

export function isOwner(user: OwnerUser | null | undefined): boolean {
  const ownerId = process.env.OWNER_DISCORD_ID?.trim();
  const discordId = user?.discordId?.trim();
  return Boolean(ownerId && discordId && discordId === ownerId);
}
