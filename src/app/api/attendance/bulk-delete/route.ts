import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

const MAX_IDS = 5000;

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as any;

  if (!(await isAdmin(user?.discordId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.opId !== "string" || !body.opId.trim()) {
    return NextResponse.json({ error: "A valid opId is required" }, { status: 400 });
  }

  const requestedOpId = body.opId.trim();

  const settings = await prisma.settings.findUnique({
    where: { id: 1 },
    select: { currentOpId: true },
  });
  const currentOpId = settings?.currentOpId?.trim() || "current";

  if (requestedOpId !== currentOpId) {
    return NextResponse.json({ error: "Only the current op can be removed in bulk" }, { status: 400 });
  }

  let ids: string[] | undefined;

  if (body.ids !== undefined) {
    if (!Array.isArray(body.ids) || body.ids.length === 0 || body.ids.length > MAX_IDS) {
      return NextResponse.json({ error: "ids must be a non-empty array with at most 5000 entries" }, { status: 400 });
    }

    const normalizedIds = body.ids.map((id: unknown) => (typeof id === "string" ? id.trim() : ""));
    if (normalizedIds.some((id) => !id) || new Set(normalizedIds).size !== normalizedIds.length) {
      return NextResponse.json({ error: "ids must contain unique non-empty strings" }, { status: 400 });
    }

    ids = normalizedIds;
  }

  const result = await prisma.submission.deleteMany({
    where: ids
      ? { opId: currentOpId, id: { in: ids } }
      : { opId: currentOpId },
  });

  return NextResponse.json({ ok: true, deleted: result.count });
}
