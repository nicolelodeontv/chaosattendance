import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwner } from "@/lib/admin";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const user = session.user as any;
  if (!isOwner(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const user = session.user as any;
  if (!isOwner(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { webhookUrl, guildName, currentOpId } = body;
  const normalizedOpId =
    typeof currentOpId === "string" ? currentOpId.trim() : undefined;

  if (normalizedOpId !== undefined && !normalizedOpId) {
    return NextResponse.json({ error: "Current op ID is required" }, { status: 400 });
  }
  if (normalizedOpId && normalizedOpId.length > 80) {
    return NextResponse.json(
      { error: "Current op ID must be 80 characters or fewer" },
      { status: 400 }
    );
  }

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      webhookUrl:
        typeof webhookUrl === "string"
          ? webhookUrl.trim() || null
          : undefined,
      guildName:
        typeof guildName === "string" && guildName.trim()
          ? guildName.trim()
          : undefined,
      currentOpId: normalizedOpId,
    },
    create: {
      id: 1,
      webhookUrl:
        typeof webhookUrl === "string" ? webhookUrl.trim() || null : null,
      guildName:
        typeof guildName === "string" && guildName.trim()
          ? guildName.trim()
          : "Squadron",
      currentOpId: normalizedOpId || "current",
    },
  });

  return NextResponse.json({ settings });
}
