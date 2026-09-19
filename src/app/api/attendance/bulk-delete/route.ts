import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

const MAX_IDS = 5000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as any;

  if (!(await isAdmin(user?.discordId))) {
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

  if (rawIds !== undefined) {
    if (!Array.isArray(rawIds) || rawIds.length === 0 || rawIds.length > MAX_IDS) {
      return NextResponse.json(
        { error: "ids must be a non-empty array with at most 5000 entries" },
        { status: 400 }
      );
    }

    const ids = rawIds.map((id) => (typeof id === "string" ? id.trim() : ""));
    if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
      return NextResponse.json(
        { error: "ids must contain unique non-empty strings" },
        { status: 400 }
      );
    }

    const result = await prisma.submission.deleteMany({
      where: {
        opId: currentOpId,
        id: { in: ids },
      },
    });

    return NextResponse.json({ ok: true, deleted: result.count });
  }

  const result = await prisma.submission.deleteMany({
    where: { opId: currentOpId },
  });

  return NextResponse.json({ ok: true, deleted: result.count });
}
