import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getRole, isOwner } from "@/lib/admin";
import { getAccessLevel } from "@/lib/admin-access";
import { canAccessTab } from "@/lib/access-control";

type PersistedAdminRole = "ADMIN" | "MANAGER";

function isPersistedAdminRole(value: unknown): value is PersistedAdminRole {
  return value === "ADMIN" || value === "MANAGER";
}

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const accessLevel = await getAccessLevel(session);
  if (!canAccessTab(accessLevel, "access")) return forbidden();

  const admins = await prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } });
  const adminRoles = new Map(
    admins.map((admin) => [admin.discordId.trim(), admin.role] as const)
  );
  const adminsWithRoles = await Promise.all(
    admins.map(async (admin) => ({
      ...admin,
      role: await getRole(admin.discordId, adminRoles),
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

  const accessLevel = await getAccessLevel(session);
  if (accessLevel !== "owner" || !canAccessTab(accessLevel, "access")) {
    return forbidden();
  }

  const body = await req.json().catch(() => null);
  const discordId = typeof body?.discordId === "string" ? body.discordId.trim() : "";
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const roleValue: unknown = body?.role === undefined ? "ADMIN" : body.role;

  if (!discordId || !/^\d+$/.test(discordId)) {
    return NextResponse.json({ error: "A valid Discord ID is required" }, { status: 400 });
  }
  if (isOwner({ discordId })) {
    return NextResponse.json(
      { error: "Owner access is configured with OWNER_DISCORD_ID and cannot be added here." },
      { status: 400 }
    );
  }
  if (!isPersistedAdminRole(roleValue)) {
    return NextResponse.json({ error: "Role must be ADMIN or MANAGER" }, { status: 400 });
  }

  const admin = await prisma.adminUser.upsert({
    where: { discordId },
    update: {
      username: username || undefined,
      role: roleValue,
    },
    create: {
      discordId,
      username: username || discordId,
      role: roleValue,
      addedBy: typeof (session.user as any)?.username === "string"
        ? (session.user as any).username
        : discordId,
    },
  });

  return NextResponse.json({ admin });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const accessLevel = await getAccessLevel(session);
  if (accessLevel !== "owner" || !canAccessTab(accessLevel, "access")) {
    return forbidden();
  }

  const body = await req.json().catch(() => null);
  const discordId = typeof body?.discordId === "string" ? body.discordId.trim() : "";
  const roleValue: unknown = body?.role;

  if (!discordId || !/^\d+$/.test(discordId)) {
    return NextResponse.json({ error: "A valid Discord ID is required" }, { status: 400 });
  }
  if (isOwner({ discordId })) {
    return NextResponse.json({ error: "The owner's access level is controlled by OWNER_DISCORD_ID." }, { status: 400 });
  }
  if (!isPersistedAdminRole(roleValue)) {
    return NextResponse.json({ error: "Role must be ADMIN or MANAGER" }, { status: 400 });
  }

  const existing = await prisma.adminUser.findUnique({
    where: { discordId },
    select: { discordId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }

  const admin = await prisma.adminUser.update({
    where: { discordId },
    data: { role: roleValue },
  });
  return NextResponse.json({ admin });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const accessLevel = await getAccessLevel(session);
  if (accessLevel !== "owner" || !canAccessTab(accessLevel, "access")) {
    return forbidden();
  }

  const body = await req.json().catch(() => null);
  const discordId = typeof body?.discordId === "string" ? body.discordId.trim() : "";
  if (!discordId || !/^\d+$/.test(discordId)) {
    return NextResponse.json({ error: "A valid Discord ID is required" }, { status: 400 });
  }
  if (isOwner({ discordId })) {
    return NextResponse.json({ error: "Cannot remove the owner" }, { status: 400 });
  }

  await prisma.adminUser.delete({ where: { discordId } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
