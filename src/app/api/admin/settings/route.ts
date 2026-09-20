import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwner } from "@/lib/admin";

const DISABLED_WEBHOOK_PREFIX = "__CHAOS_DISCORD_DISABLED__::";

function decodeWebhook(raw: string | null): { webhookUrl: string; enabled: boolean } {
  if (!raw) return { webhookUrl: "", enabled: true };
  if (raw.startsWith(DISABLED_WEBHOOK_PREFIX)) {
    const stored = raw.slice(DISABLED_WEBHOOK_PREFIX.length);
    return { webhookUrl: stored === "__ENV__" ? "" : stored, enabled: false };
  }
  return { webhookUrl: raw, enabled: true };
}

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
  const webhook = decodeWebhook(settings.webhookUrl);

  return NextResponse.json({
    settings: {
      ...settings,
      webhookUrl: webhook.webhookUrl,
      notificationsEnabled: webhook.enabled,
    },
  });
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

  const { webhookUrl, guildName, currentOpId, notifyDiscord } = body;
  const normalizedWebhook =
    typeof webhookUrl === "string" ? webhookUrl.trim() : "";
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

  const notificationsEnabled = notifyDiscord !== false;
  const storedWebhook =
    notificationsEnabled
      ? normalizedWebhook || null
      : DISABLED_WEBHOOK_PREFIX + (normalizedWebhook || "__ENV__");

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      webhookUrl: storedWebhook,
      guildName:
        typeof guildName === "string" && guildName.trim()
          ? guildName.trim()
          : undefined,
      currentOpId: normalizedOpId,
    },
    create: {
      id: 1,
      webhookUrl: storedWebhook,
      guildName:
        typeof guildName === "string" && guildName.trim()
          ? guildName.trim()
          : "Squadron",
      currentOpId: normalizedOpId || "current",
    },
  });

  const webhook = decodeWebhook(settings.webhookUrl);

  return NextResponse.json({
    settings: {
      ...settings,
      webhookUrl: webhook.webhookUrl,
      notificationsEnabled: webhook.enabled,
    },
  });
}
