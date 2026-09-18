import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export async function GET() {
  const session = await auth();
  const user = session?.user as any;
  if (!(await isAdmin(user?.discordId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admins = await prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ admins, ownerDiscordId: process.env.OWNER_DISCORD_ID ?? null });
}

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!(await isAdmin(user?.discordId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const discordId = body?.discordId?.trim();
  const username = body?.username?.trim();
  if (!discordId) {
    return NextResponse.json({ error: "Discord ID is required" }, { status: 400 });
  }

  const admin = await prisma.adminUser.upsert({
    where: { discordId },
    update: {},
    create: { discordId, username: username || discordId, addedBy: user.username ?? user.discordId },
  });

  return NextResponse.json({ admin });
}

export async function DELETE(req: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!(await isAdmin(user?.discordId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const discordId = body?.discordId?.trim();
  if (!discordId) {
    return NextResponse.json({ error: "Discord ID is required" }, { status: 400 });
  }
  if (discordId === process.env.OWNER_DISCORD_ID) {
    return NextResponse.json({ error: "Cannot remove the owner" }, { status: 400 });
  }

  await prisma.adminUser.delete({ where: { discordId } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
