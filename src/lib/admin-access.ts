import { prisma } from "@/lib/prisma";
import { isOwner } from "@/lib/admin";
import type { AccessLevel } from "@/lib/access-control";

type SessionWithDiscordUser = {
  user?: { discordId?: unknown } | null;
} | null | undefined;

export async function getAccessLevel(
  session: SessionWithDiscordUser
): Promise<AccessLevel | null> {
  const user = session?.user;
  const discordId =
    typeof user?.discordId === "string" ? user.discordId.trim() : "";

  if (!/^\\d+$/.test(discordId)) return null;
  if (isOwner({ discordId })) return "owner";

  const admin = await prisma.adminUser.findUnique({
    where: { discordId },
    select: { role: true },
  });
  if (!admin) return null;

  return admin.role === "MANAGER" ? "manager" : "admin";
}
