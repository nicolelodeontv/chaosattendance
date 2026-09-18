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

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!(await isAdmin(user?.discordId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { webhookUrl, guildName } = body;

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      webhookUrl: typeof webhookUrl === "string" ? webhookUrl.trim() || null : undefined,
      guildName: typeof guildName === "string" && guildName.trim() ? guildName.trim() : undefined,
    },
    create: {
      id: 1,
      webhookUrl: typeof webhookUrl === "string" ? webhookUrl.trim() || null : null,
      guildName: typeof guildName === "string" && guildName.trim() ? guildName.trim() : "Squadron",
    },
  });

  return NextResponse.json({ settings });
}
