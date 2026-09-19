import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRole, isOwner } from "@/lib/admin";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const user = session.user as any;
  if (!isOwner(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admins = await prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } });
  const adminIds = new Set(admins.map((admin) => admin.discordId.trim()));
  const adminsWithRoles = await Promise.all(
    admins.map(async (admin) => ({
      ...admin,
      role: await getRole(admin.discordId, adminIds),
    }))
  );
  return NextResponse.json({
    admins: adminsWithRoles,
    ownerRole: "owner",
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const user = session.user as any;
  if (!isOwner(user)) {
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
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const user = session.user as any;
  if (!isOwner(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const discordId = body?.discordId?.trim();
  if (!discordId) {
    return NextResponse.json({ error: "Discord ID is required" }, { status: 400 });
  }
  if (isOwner({ discordId })) {
    return NextResponse.json({ error: "Cannot remove the owner" }, { status: 400 });
  }

  await prisma.adminUser.delete({ where: { discordId } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
