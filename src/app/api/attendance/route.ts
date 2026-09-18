import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { notifyDiscord } from "@/lib/discord";

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.discordId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { ign, attending, hasPilot, pilotName, hours, notes } = body;

  if (typeof ign !== "string" || !ign.trim()) {
    return NextResponse.json({ error: "IGN is required" }, { status: 400 });
  }
  if (typeof attending !== "boolean" || typeof hasPilot !== "boolean") {
    return NextResponse.json({ error: "Invalid attendance/pilot value" }, { status: 400 });
  }
  if (hasPilot && (typeof pilotName !== "string" || !pilotName.trim())) {
    return NextResponse.json({ error: "Pilot name is required" }, { status: 400 });
  }
  const hoursNum = Number(hours);
  if (!Number.isFinite(hoursNum) || hoursNum < 0) {
    return NextResponse.json({ error: "Hours must be a valid number" }, { status: 400 });
  }

  const submission = await prisma.submission.create({
    data: {
      discordId: user.discordId,
      discordUsername: user.username ?? "Unknown",
      discordAvatar: user.avatar ?? null,
      ign: ign.trim(),
      attending,
      hasPilot,
      pilotName: hasPilot ? pilotName.trim() : null,
      hours: hoursNum,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
    },
  });

  await notifyDiscord({
    discordUsername: user.username ?? "Unknown",
    ign: submission.ign,
    attending: submission.attending,
    hasPilot: submission.hasPilot,
    pilotName: submission.pilotName,
    hours: submission.hours,
    notes: submission.notes,
  });

  return NextResponse.json({ ok: true, id: submission.id });
}

export async function GET() {
  const session = await auth();
  const user = session?.user as any;
  if (!(await isAdmin(user?.discordId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const submissions = await prisma.submission.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ submissions });
}
