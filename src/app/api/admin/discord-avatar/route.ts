import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";

const CACHE_TTL_MS = 5 * 60 * 1000;
const avatarCache = new Map<string, { avatarUrl: string; expiresAt: number }>();
const DEFAULT_AVATAR = "https://cdn.discordapp.com/embed/avatars/0.png";

export async function GET(req: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!(await isAdmin(user?.discordId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const discordId = new URL(req.url).searchParams.get("discordId")?.trim();
  if (!discordId || !/^d{17,20}$/.test(discordId)) {
    return NextResponse.json({ error: "Invalid Discord user ID" }, { status: 400 });
  }

  const cached = avatarCache.get(discordId);
  if (cached && cached.expiresAt > Date.now()) return NextResponse.json({ avatarUrl: cached.avatarUrl, cached: true });
  avatarCache.delete(discordId);

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ avatarUrl: DEFAULT_AVATAR, fallback: true });

  try {
    const response = await fetch(`https://discord.com/api/v10/users/${discordId}`, {
      headers: { Authorization: `Bot ${token}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Discord API returned ${response.status}`);
    const profile = (await response.json()) as { avatar?: string | null };
    const avatarUrl = profile.avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${profile.avatar}.png`
      : DEFAULT_AVATAR;
    avatarCache.set(discordId, { avatarUrl, expiresAt: Date.now() + CACHE_TTL_MS });
    return NextResponse.json({ avatarUrl });
  } catch {
    avatarCache.set(discordId, { avatarUrl: DEFAULT_AVATAR, expiresAt: Date.now() + CACHE_TTL_MS });
    return NextResponse.json({ avatarUrl: DEFAULT_AVATAR, fallback: true });
  }
}