import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRole, isAdmin } from "@/lib/admin";
import { notifyDiscord } from "@/lib/discord";

const MAX_NOTES_LENGTH = 500;
const MAX_IGN_LENGTH = 64;
const MAX_PILOT_NAME_LENGTH = 64;

const MEMBER_LOCK_ERROR =
  "You've already submitted for this op. Ask an admin if something needs to change.";
const DUPLICATE_IGN_ERROR =
  "That IGN is already used by another submission.";

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as any;
  const discordId = typeof user?.discordId === "string" ? user.discordId.trim() : "";

  if (!discordId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const settings = await prisma.settings
    .findUnique({ where: { id: 1 }, select: { currentOpId: true } })
    .catch(() => null);
  const opId = settings?.currentOpId?.trim() || "current";

  const existing = await prisma.submission.findUnique({
    where: {
      opId_discordId: {
        opId,
        discordId,
      },
    },
  });

  let role: Awaited<ReturnType<typeof getRole>> = "member";
  try {
    role = await getRole(discordId);
  } catch {
    role = "member";
  }

  if (existing && role === "member") {
    return NextResponse.json({ error: MEMBER_LOCK_ERROR }, { status: 409 });
  }

  const { ign, attending, hasPilot, pilotName, hours, notes } = body;

  if (typeof ign !== "string" || !ign.trim()) {
    return NextResponse.json({ error: "IGN is required" }, { status: 400 });
  }
  if (ign.trim().length > MAX_IGN_LENGTH) {
    return NextResponse.json(
      { error: `IGN must be ${MAX_IGN_LENGTH} characters or fewer.` },
      { status: 400 }
    );
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
  if (hasPilot && pilotName.trim().length > MAX_PILOT_NAME_LENGTH) {
    return NextResponse.json(
      { error: `Pilot name must be ${MAX_PILOT_NAME_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  const hoursNum = Number(hours);
  if (!Number.isFinite(hoursNum) || hoursNum < 0) {
    return NextResponse.json({ error: "Hours must be a valid number" }, { status: 400 });
  }

  if (typeof notes !== "undefined" && notes !== null && typeof notes !== "string") {
    return NextResponse.json({ error: "Notes must be text." }, { status: 400 });
  }
  const normalizedNotes = typeof notes === "string" ? notes.trim() : "";
  if (normalizedNotes.length > MAX_NOTES_LENGTH) {
    return NextResponse.json(
      { error: `Notes must be ${MAX_NOTES_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  const normalizedIgn = ign.trim();
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
      { error: DUPLICATE_IGN_ERROR },
      { status: 409 }
    );
  }

  try {
    const submission = existing
      ? await prisma.submission.update({
          where: { id: existing.id },
          data: {
            discordUsername: user.username ?? "Unknown",
            discordAvatar: user.avatar ?? null,
            ign: normalizedIgn,
            attending,
            hasPilot,
            pilotName: hasPilot ? pilotName.trim() : null,
            hours: hoursNum,
            notes: normalizedNotes || null,
            createdAt: new Date(),
          },
        })
      : await prisma.submission.create({
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
            notes: normalizedNotes || null,
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
      created: !existing,
    });

    return NextResponse.json({
      ok: true,
      id: submission.id,
      created: !existing,
      submission: {
        id: submission.id,
        opId: submission.opId,
        discordUsername: submission.discordUsername,
        discordAvatar: submission.discordAvatar,
        ign: submission.ign,
        attending: submission.attending,
        hasPilot: submission.hasPilot,
        pilotName: submission.pilotName,
        hours: submission.hours,
        notes: submission.notes,
        createdAt: submission.createdAt.toISOString(),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const ownSubmission = await prisma.submission.findUnique({
        where: {
          opId_discordId: {
            opId,
            discordId,
          },
        },
        select: { id: true },
      });

      if (ownSubmission) {
        return NextResponse.json({ error: MEMBER_LOCK_ERROR }, { status: 409 });
      }
    }

    console.error("Attendance submission failed:", error);
    return NextResponse.json({ error: "Unable to save your submission." }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  const user = session?.user as any;
  if (!(await isAdmin(user?.discordId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [submissions, admins, settings] = await Promise.all([
    prisma.submission.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.adminUser.findMany({ select: { discordId: true } }),
    prisma.settings.findUnique({
      where: { id: 1 },
      select: { currentOpId: true },
    }).catch(() => null),
  ]);

  const currentOpId = settings?.currentOpId?.trim() || "current";
  const adminIds = new Set(admins.map((admin) => admin.discordId.trim()));

  const submissionsWithRoles = await Promise.all(
    submissions.map(async (submission) => ({
      ...submission,
      role: await getRole(submission.discordId, adminIds),
    }))
  );

  return NextResponse.json({
    currentOpId,
    submissions: submissionsWithRoles,
  });
}
