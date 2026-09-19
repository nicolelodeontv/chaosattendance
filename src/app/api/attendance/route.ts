import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRole, isAdmin } from "@/lib/admin";
import { notifyDiscord } from "@/lib/discord";

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as any;
  const discordId = typeof user?.discordId === "string" ? user.discordId.trim() : "";

  if (!discordId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { ign, attending, hasPilot, pilotName, hours, notes } = body;
  const settings = await prisma.settings
    .findUnique({ where: { id: 1 }, select: { currentOpId: true } })
    .catch(() => null);
  const opId = settings?.currentOpId?.trim() || "current";

  if (typeof ign !== "string" || !ign.trim()) {
    return NextResponse.json({ error: "IGN is required" }, { status: 400 });
  }
  if (typeof attending !== "boolean" || typeof hasPilot !== "boolean") {
    return NextResponse.json(
      { error: "Invalid attendance/pilot value" },
      { status: 400 }
    );
  }
  if (hasPilot && (typeof pilotName !== "string" || !pilotName.trim())) {
    return NextResponse.json({ error: "Pilot name is required" }, { status: 400 });
  }
  const hoursNum = Number(hours);
  if (!Number.isFinite(hoursNum) || hoursNum < 0) {
    return NextResponse.json({ error: "Hours must be a valid number" }, { status: 400 });
  }

  const normalizedIgn = ign.trim();
  const existing = await prisma.submission.findUnique({
    where: {
      opId_discordId: {
        opId,
        discordId,
      },
    },
    select: { id: true },
  });

  const submissionsForOp = await prisma.submission.findMany({
    where: {
      opId,
      ...(existing ? { id: { not: existing.id } } : {}),
    },
    select: { ign: true },
  });

  const normalizedIgnKey = normalizedIgn.toLowerCase();
  const duplicateIgn = submissionsForOp.some(
    (submission) => submission.ign.trim().toLowerCase() === normalizedIgnKey
  );

  if (duplicateIgn) {
    return NextResponse.json(
      { error: "That IGN is already used by another submission." },
      { status: 409 }
    );
  }

  if (existing) {
    const submission = await prisma.submission.update({
      where: { id: existing.id },
      data: {
        discordUsername: user.username ?? "Unknown",
        discordAvatar: user.avatar ?? null,
        ign: normalizedIgn,
        attending,
        hasPilot,
        pilotName: hasPilot ? pilotName.trim() : null,
        hours: hoursNum,
        notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
        createdAt: new Date(),
      },
    });

    await notifyDiscord({
      opId,
      discordUsername: user.username ?? "Unknown",
      ign: submission.ign,
      attending: submission.attending,
      hasPilot: submission.hasPilot,
      pilotName: submission.pilotName,
      hours: submission.hours,
      notes: submission.notes,
    });

    return NextResponse.json({ ok: true, id: submission.id, created: false });
  }

  try {
    const submission = await prisma.submission.create({
      data: {
        opId,
        discordId,
        discordUsername: user.username ?? "Unknown",
        discordAvatar: user.avatar ?? null,
        ign: normalizedIgn,
        attending,
        hasPilot,
        pilotName: hasPilot ? pilotName.trim() : null,
        hours: hoursNum,
        notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
      },
    });

    await notifyDiscord({
      opId,
      discordUsername: user.username ?? "Unknown",
      ign: submission.ign,
      attending: submission.attending,
      hasPilot: submission.hasPilot,
      pilotName: submission.pilotName,
      hours: submission.hours,
      notes: submission.notes,
    });

    return NextResponse.json({ ok: true, id: submission.id, created: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const ownSubmission = await prisma.submission.findFirst({
        where: { opId, discordId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      if (ownSubmission) {
        return NextResponse.json({
          error: "Your submission already exists. Refresh the form and try again.",
        }, { status: 409 });
      }
    }
    throw error;
  }
}

export async function GET() {
  const session = await auth();
  const user = session?.user as any;
  if (!(await isAdmin(user?.discordId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [submissions, admins] = await Promise.all([
    prisma.submission.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.adminUser.findMany({ select: { discordId: true } }),
  ]);

  const adminIds = new Set(admins.map((admin) => admin.discordId.trim()));

  const submissionsWithRoles = await Promise.all(
    submissions.map(async (submission) => ({
      ...submission,
      role: await getRole(submission.discordId, adminIds),
    }))
  );

  return NextResponse.json({
    submissions: submissionsWithRoles,
  });
}
