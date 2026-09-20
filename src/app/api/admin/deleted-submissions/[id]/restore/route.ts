import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwner } from "@/lib/admin";
import { logServerError } from "@/lib/server-error";

const MEMBER_RESUBMITTED_ERROR =
  "This member has already submitted again. Delete their new response first.";

function isMissingArchiveTable(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021"
  );
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const user = session?.user as any;

  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!isOwner(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const archived = await prisma.deletedSubmission.findUnique({
      where: { id: params.id },
    });

    if (!archived) {
      return NextResponse.json({ error: "Archived submission not found" }, { status: 404 });
    }

    const restored = await prisma.$transaction(async (tx) => {
      const existing = await tx.submission.findUnique({
        where: {
          opId_discordId: {
            opId: archived.opId,
            discordId: archived.discordId,
          },
        },
      });

      if (existing) {
        throw new Error(MEMBER_RESUBMITTED_ERROR);
      }

      const submission = await tx.submission.create({
        data: {
          id: archived.originalId,
          opId: archived.opId,
          discordId: archived.discordId,
          discordUsername: archived.discordUsername,
          discordAvatar: archived.discordAvatar,
          ign: archived.ign,
          attending: archived.attending,
          hasPilot: archived.hasPilot,
          pilotName: archived.pilotName,
          hours: archived.hours,
          notes: archived.notes,
          createdAt: archived.createdAt,
        },
      });

      await tx.deletedSubmission.delete({ where: { id: archived.id } });
      return submission;
    });

    return NextResponse.json({ ok: true, submission: restored });
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

    if (error instanceof Error && error.message === MEMBER_RESUBMITTED_ERROR) {
      return NextResponse.json({ error: MEMBER_RESUBMITTED_ERROR }, { status: 409 });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: MEMBER_RESUBMITTED_ERROR }, { status: 409 });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Archived submission not found" }, { status: 404 });
    }

    logServerError("Failed to restore archived submission", error);
    return NextResponse.json({ error: "Unable to restore submission." }, { status: 500 });
  }
}
