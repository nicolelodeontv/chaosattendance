import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRole, isAdmin } from "@/lib/admin";
import { checkDiscordGuildMembership } from "@/lib/discord-membership";
import { notifyDiscord } from "@/lib/discord";
import { logServerError } from "@/lib/server-error";

const MAX_NOTES_LENGTH = 500;
const MAX_IGN_LENGTH = 64;
const MAX_PILOT_NAME_LENGTH = 64;
const IGN_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} ._'-]*$/u;

const DUPLICATE_SUBMISSION_ERROR = "You've already submitted for this op.";
const DUPLICATE_IGN_ERROR =
  "That IGN is already used by another submission.";
const MEMBERSHIP_UNAVAILABLE_ERROR =
  "We couldn't verify your Chaos membership. Please try again.";
const MEMBERSHIP_REQUIRED_ERROR =
  "You must be a member of the Chaos Discord server to submit.";

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as any;
  const discordId =
    typeof user?.discordId === "string" ? user.discordId.trim() : "";

  if (!discordId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const membership = await checkDiscordGuildMembership(discordId);
  if (membership === "not_member") {
    return NextResponse.json(
      { error: MEMBERSHIP_REQUIRED_ERROR },
      { status: 403 }
    );
  }
  if (membership === "unavailable") {
    return NextResponse.json(
      { error: MEMBERSHIP_UNAVAILABLE_ERROR },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

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
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { error: DUPLICATE_SUBMISSION_ERROR },
      { status: 409 }
    );
  }

  const { ign, attending, hasPilot, pilotName, hours, notes } =
    body as Record<string, unknown>;

  if (typeof ign !== "string" || !ign.trim()) {
    return NextResponse.json({ error: "IGN is required" }, { status: 400 });
  }

  const normalizedIgn = ign.trim();
  if (normalizedIgn.length > MAX_IGN_LENGTH) {
    return NextResponse.json(
      { error: `IGN must be ${MAX_IGN_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  if (!IGN_PATTERN.test(normalizedIgn)) {
    return NextResponse.json(
      { error: "IGN contains unsupported characters." },
      { status: 400 }
    );
  }

  if (typeof attending !== "boolean" || typeof hasPilot !== "boolean") {
    return NextResponse.json(
      { error: "Invalid attendance/pilot value" },
      { status: 400 }
    );
  }

  const normalizedPilotName =
    typeof pilotName === "string" ? pilotName.trim() : "";

  if (hasPilot && !normalizedPilotName) {
    return NextResponse.json(
      { error: "Pilot name is required" },
      { status: 400 }
    );
  }

  if (
    normalizedPilotName.length > MAX_PILOT_NAME_LENGTH ||
    (normalizedPilotName && !IGN_PATTERN.test(normalizedPilotName))
  ) {
    return NextResponse.json(
      {
        error: `Pilot name must be ${MAX_PILOT_NAME_LENGTH} characters or use supported characters.`,
      },
      { status: 400 }
    );
  }

  const hoursNum = Number(hours);
  if (!Number.isFinite(hoursNum) || hoursNum < 0) {
    return NextResponse.json(
      { error: "Hours must be a valid number" },
      { status: 400 }
    );
  }

  if (
    typeof notes !== "undefined" &&
    notes !== null &&
    typeof notes !== "string"
  ) {
    return NextResponse.json({ error: "Notes must be text." }, { status: 400 });
  }

  const normalizedNotes = typeof notes === "string" ? notes.trim() : "";
  if (normalizedNotes.length > MAX_NOTES_LENGTH) {
    return NextResponse.json(
      {
        error: `Notes must be ${MAX_NOTES_LENGTH} characters or fewer.`,
      },
      { status: 400 }
    );
  }

  const submissionsForOp = await prisma.submission.findMany({
    where: { opId },
    select: { ign: true },
  });

  const normalizedIgnKey = normalizedIgn.toLowerCase();
  const duplicateIgn = submissionsForOp.some(
    (submission) =>
      submission.ign.trim().toLowerCase() === normalizedIgnKey
  );

  if (duplicateIgn) {
    return NextResponse.json(
      { error: DUPLICATE_IGN_ERROR },
      { status: 409 }
    );
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
        pilotName: hasPilot ? normalizedPilotName : null,
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
      created: true,
    });

    return NextResponse.json({
      ok: true,
      id: submission.id,
      created: true,
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
      return NextResponse.json(
        { error: DUPLICATE_SUBMISSION_ERROR },
        { status: 409 }
      );
    }

    logServerError("Attendance submission failed:", error);
    return NextResponse.json(
      { error: "Unable to save your submission." },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await auth();
  const user = session?.user as any;

  const membership = await checkDiscordGuildMembership(
    typeof user?.discordId === "string" ? user.discordId.trim() : ""
  );
  if (membership === "not_member") {
    return NextResponse.json(
      { error: MEMBERSHIP_REQUIRED_ERROR },
      { status: 403 }
    );
  }
  if (membership === "unavailable") {
    return NextResponse.json(
      { error: MEMBERSHIP_UNAVAILABLE_ERROR },
      { status: 503 }
    );
  }

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
