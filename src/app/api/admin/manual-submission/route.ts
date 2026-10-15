import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRole } from "@/lib/admin";
import { DiscordRosterFetchError, fetchDiscordRoster, type DiscordRosterMember } from "@/lib/discord-roster";
import { logServerError } from "@/lib/server-error";

const MAX_NOTES_LENGTH = 500;
const MAX_IGN_LENGTH = 64;
const MAX_PILOT_NAME_LENGTH = 64;
const IGN_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} ._'-]*$/u;
const DISCORD_ID_PATTERN = /^\d{17,20}$/;

export const dynamic = "force-dynamic";

/**
 * Create an ordinary current-operation submission on behalf of a roster member.
 * The audit fields are assigned exclusively from the authenticated admin session.
 */
export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as {
    discordId?: unknown;
  } | undefined;
  const adminDiscordId =
    typeof user?.discordId === "string" ? user.discordId.trim() : "";

  if (!/^\d+$/.test(adminDiscordId)) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const role = await getRole(adminDiscordId);
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const {
    memberId,
    ign,
    attending,
    hasPilot,
    pilotName,
    hours,
    notes,
  } = body as Record<string, unknown>;

  if (typeof memberId !== "string" || !DISCORD_ID_PATTERN.test(memberId.trim())) {
    return NextResponse.json({ error: "A valid Discord member ID is required." }, { status: 400 });
  }
  const targetDiscordId = memberId.trim();

  if (typeof ign !== "string" || !ign.trim()) {
    return NextResponse.json({ error: "IGN is required." }, { status: 400 });
  }
  const normalizedIgn = ign.trim();
  if (normalizedIgn.length > MAX_IGN_LENGTH) {
    return NextResponse.json({ error: `IGN must be ${MAX_IGN_LENGTH} characters or fewer.` }, { status: 400 });
  }
  if (!IGN_PATTERN.test(normalizedIgn)) {
    return NextResponse.json({ error: "IGN contains unsupported characters." }, { status: 400 });
  }

  if (typeof attending !== "boolean" || typeof hasPilot !== "boolean") {
    return NextResponse.json({ error: "Invalid attendance or pilot status." }, { status: 400 });
  }

  const normalizedPilotName = typeof pilotName === "string" ? pilotName.trim() : "";
  if (hasPilot && !normalizedPilotName) {
    return NextResponse.json({ error: "Pilot name is required when Have Pilot is selected." }, { status: 400 });
  }
  if (
    normalizedPilotName.length > MAX_PILOT_NAME_LENGTH ||
    (normalizedPilotName && !IGN_PATTERN.test(normalizedPilotName))
  ) {
    return NextResponse.json(
      { error: `Pilot name must be ${MAX_PILOT_NAME_LENGTH} characters or use supported characters.` },
      { status: 400 }
    );
  }

  if (
    hours === null ||
    (typeof hours !== "number" && typeof hours !== "string") ||
    String(hours).trim() === ""
  ) {
    return NextResponse.json({ error: "Hours are required." }, { status: 400 });
  }
  const hoursNum = Number(hours);
  if (!Number.isFinite(hoursNum) || hoursNum < 0) {
    return NextResponse.json({ error: "Hours must be a valid non-negative number." }, { status: 400 });
  }

  if (notes !== undefined && notes !== null && typeof notes !== "string") {
    return NextResponse.json({ error: "Notes must be text." }, { status: 400 });
  }
  const normalizedNotes = typeof notes === "string" ? notes.trim() : "";
  if (normalizedNotes.length > MAX_NOTES_LENGTH) {
    return NextResponse.json(
      { error: `Notes must be ${MAX_NOTES_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  let roster: DiscordRosterMember[];
  try {
    roster = await fetchDiscordRoster({ forceRefresh: true });
  } catch (error) {
    logServerError("Unable to verify manual-submission roster member:", error);
    return NextResponse.json(
      {
        error: error instanceof DiscordRosterFetchError
          ? "Could not verify the Discord roster right now. Please try again."
          : "Unable to verify the Discord member. Please try again.",
      },
      { status: 503 }
    );
  }

  const member = roster.find((candidate) => candidate.id === targetDiscordId);
  if (!member) {
    return NextResponse.json(
      { error: "That Discord member is no longer in the server roster. Refresh the roster and try again." },
      { status: 404 }
    );
  }

  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 1 },
      select: { currentOpId: true },
    });
    const opId = settings?.currentOpId?.trim() || "current";

    const existing = await prisma.submission.findUnique({
      where: {
        opId_discordId: {
          opId,
          discordId: targetDiscordId,
        },
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "This member already has a submission for the current operation." },
        { status: 409 }
      );
    }

    const submissionsForOp = await prisma.submission.findMany({
      where: { opId },
      select: { ign: true },
    });
    const ignKey = normalizedIgn.toLowerCase();
    if (submissionsForOp.some((submission) => submission.ign.trim().toLowerCase() === ignKey)) {
      return NextResponse.json(
        { error: "That IGN is already used by another submission." },
        { status: 409 }
      );
    }

    const discordUsername =
      member.username?.trim() ||
      member.globalName?.trim() ||
      member.nick?.trim() ||
      `Discord ${targetDiscordId}`;

    const submission = await prisma.submission.create({
      data: {
        opId,
        discordId: targetDiscordId,
        discordUsername,
        discordAvatar: member.avatar ?? null,
        ign: normalizedIgn,
        attending,
        hasPilot,
        pilotName: hasPilot ? normalizedPilotName : null,
        hours: hoursNum,
        notes: normalizedNotes || null,
        submittedByAdmin: true,
        enteredBy: adminDiscordId,
      },
    });

    return NextResponse.json({
      ok: true,
      submission: {
        id: submission.id,
        opId: submission.opId,
        discordId: submission.discordId,
        discordUsername: submission.discordUsername,
        ign: submission.ign,
        attending: submission.attending,
        hasPilot: submission.hasPilot,
        pilotName: submission.pilotName,
        hours: submission.hours,
        notes: submission.notes,
        submittedByAdmin: submission.submittedByAdmin,
        enteredBy: submission.enteredBy,
        createdAt: submission.createdAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "This member already has a submission for the current operation." },
        { status: 409 }
      );
    }

    logServerError("Manual attendance submission failed:", error);
    return NextResponse.json(
      { error: "Unable to save the manual submission. Please try again." },
      { status: 500 }
    );
  }
}
