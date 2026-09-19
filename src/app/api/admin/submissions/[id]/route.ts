import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

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
  if (typeof attending !== "boolean" || typeof hasPilot !== "boolean") return NextResponse.json({ error: "Invalid attendance/pilot value" }, { status: 400 });
  if (hasPilot && (typeof pilotName !== "string" || !pilotName.trim())) return NextResponse.json({ error: "Pilot name is required" }, { status: 400 });
  const hoursNum = Number(hours);
  if (!Number.isFinite(hoursNum) || hoursNum < 0) return NextResponse.json({ error: "Hours must be a valid number" }, { status: 400 });

  const existing = await prisma.submission.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  const submission = await prisma.submission.update({
    where: { id: params.id },
    data: {
      ign: ign.trim(),
      attending,
      hasPilot,
      pilotName: hasPilot ? pilotName.trim() : null,
      hours: hoursNum,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
    },
  });

  return NextResponse.json({ ok: true, submission });
}
