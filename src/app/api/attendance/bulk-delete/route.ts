import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwner } from "@/lib/admin";
import { logServerError } from "@/lib/server-error";


const MAX_IDS = 5000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMissingArchiveTable(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021"
  );
}

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as any;

  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!isOwner(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: unknown = await req.json().catch(() => null);
  if (!isRecord(body) || typeof body.opId !== "string" || !body.opId.trim()) {
    return NextResponse.json({ error: "A valid opId is required" }, { status: 400 });
  }

  const requestedOpId = body.opId.trim();

  const settings = await prisma.settings.findUnique({
    where: { id: 1 },
    select: { currentOpId: true },
  });
  const currentOpId = settings?.currentOpId?.trim() || "current";

  if (requestedOpId !== currentOpId) {
    return NextResponse.json(
      { error: "Only the current op can be removed in bulk" },
      { status: 400 }
    );
  }

  const rawIds = body.ids;
  let ids: string[] | null = null;

  if (rawIds !== undefined) {
    if (!Array.isArray(rawIds) || rawIds.length === 0 || rawIds.length > MAX_IDS) {
      return NextResponse.json(
        { error: "ids must be a non-empty array with at most 5000 entries" },
        { status: 400 }
      );
    }

    ids = rawIds.map((id) => (typeof id === "string" ? id.trim() : ""));
    if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
      return NextResponse.json(
        { error: "ids must contain unique non-empty strings" },
        { status: 400 }
      );
    }
  }

  const where = ids
    ? { opId: currentOpId, id: { in: ids } }
    : { opId: currentOpId };

  const rows = await prisma.submission.findMany({ where });

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0 });
  }

  const rowIds = rows.map((row) => row.id);
  const archiveRows = rows.map((row) => ({
    originalId: row.id,
    opId: row.opId,
    discordId: row.discordId,
    discordUsername: row.discordUsername,
    discordAvatar: row.discordAvatar,
    ign: row.ign,
    attending: row.attending,
    hasPilot: row.hasPilot,
    pilotName: row.pilotName,
    hours: row.hours,
    notes: row.notes,
    createdAt: row.createdAt,
    deletedByDiscordId: user.discordId.trim(),
  }));

  try {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.deletedSubmission.createMany({ data: archiveRows });
        await tx.submission.deleteMany({ where: { id: { in: rowIds } } });
      });
    } catch (archiveError) {
      if (!isMissingArchiveTable(archiveError)) {
        throw archiveError;
      }

      logServerError(
        "DeletedSubmission archive table is missing; deleting without archive.",
        archiveError
      );
      await prisma.submission.deleteMany({ where: { id: { in: rowIds } } });
    }

    return NextResponse.json({ ok: true, deleted: rows.length });
  } catch (error) {
    logServerError("Failed to remove submissions", error);
    return NextResponse.json({ error: "Unable to remove submissions." }, { status: 500 });
  }
}
