import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwner } from "@/lib/admin";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function isMissingArchiveTable(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021"
  );
}

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

  try {
    const submissions = await prisma.deletedSubmission.findMany({
      where: { deletedAt: { gte: cutoff } },
      orderBy: { deletedAt: "desc" },
    });

    return NextResponse.json({ submissions });
  } catch (error) {
    if (isMissingArchiveTable(error)) {
      return NextResponse.json(
        {
          code: "ARCHIVE_NOT_SET_UP",
          error: "Recently removed isn't set up yet. The archive table hasn't been created.",
        },
        { status: 503 }
      );
    }

    console.error("Failed to load deleted submissions", error);
    return NextResponse.json(
      { error: "Unable to load recently removed submissions." },
      { status: 500 }
    );
  }
}
