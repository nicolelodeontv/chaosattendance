import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

const MAX_NOTES_LENGTH = 500;
const MAX_IGN_LENGTH = 64;
const MAX_PILOT_NAME_LENGTH = 64;
const DUPLICATE_IGN_ERROR = "That IGN is already used by another submission.";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const user = session?.user as any;
  if (!(await isAdmin(user?.discordId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { ign, attending, hasPilot, pilotName, hours, notes } = body;
  if (typeof ign !== "string" || !ign.trim()) return NextResponse.json({ error: "IGN is required" }, { status: 400 });
  if (ign.trim().length > MAX_IGN_LENGTH) {
    return NextResponse.json({ error: `IGN must be ${MAX_IGN_LENGTH} characters or fewer.` }, { status: 400 });
  }
  if (typeof attending !== "boolean" || typeof hasPilot !== "boolean") return NextResponse.json({ error: "Invalid attendance/pilot value" }, { status: 400 });
  if (hasPilot && (typeof pilotName !== "string" || !pilotName.trim())) return NextResponse.json({ error: "Pilot name is required" }, { status: 400 });
  if (hasPilot && pilotName.trim().length > MAX_PILOT_NAME_LENGTH) {
    return NextResponse.json({ error: `Pilot name must be ${MAX_PILOT_NAME_LENGTH} characters or fewer.` }, { status: 400 });
  }
  if (typeof notes !== "undefined" && notes !== null && typeof notes !== "string") {
    return NextResponse.json({ error: "Notes must be text." }, { status: 400 });
  }
  const normalizedNotes = typeof notes === "string" ? notes.trim() : "";
  if (normalizedNotes.length > MAX_NOTES_LENGTH) {
    return NextResponse.json({ error: `Notes must be ${MAX_NOTES_LENGTH} characters or fewer.` }, { status: 400 });
  }
  const normalizedIgn = ign.trim();
  const hoursNum = Number(hours);
  if (!Number.isFinite(hoursNum) || hoursNum < 0) return NextResponse.json({ error: "Hours must be a valid number" }, { status: 400 });

  const existing = await prisma.submission.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  const submissionsForOp = await prisma.submission.findMany({
    where: {
      opId: existing.opId,
      id: { not: existing.id },
    },
    select: { ign: true },
  });
  const normalizedIgnKey = normalizedIgn.toLowerCase();
  const duplicateIgn = submissionsForOp.some(
    (submission) => submission.ign.trim().toLowerCase() === normalizedIgnKey
  );

  if (duplicateIgn) {
    return NextResponse.json({ error: DUPLICATE_IGN_ERROR }, { status: 409 });
  }

  const submission = await prisma.submission.update({
    where: { id: params.id },
    data: {
      ign: normalizedIgn,
      attending,
      hasPilot,
      pilotName: hasPilot ? pilotName.trim() : null,
      hours: hoursNum,
      notes: normalizedNotes || null,
    },
  });

  return NextResponse.json({ ok: true, submission });
}
