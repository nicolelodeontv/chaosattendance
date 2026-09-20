import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwner } from "@/lib/admin";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET() {
  const session = await auth();
  const user = session?.user as any;

  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!isOwner(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);
  const submissions = await prisma.deletedSubmission.findMany({
    where: { deletedAt: { gte: cutoff } },
    orderBy: { deletedAt: "desc" },
  });

  return NextResponse.json({ submissions });
}
