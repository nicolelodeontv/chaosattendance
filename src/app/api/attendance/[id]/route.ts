import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { logServerError } from "@/lib/server-error";

function isMissingArchiveTable(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021"
  );
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const user = session?.user as any;

  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!(await isAdmin(user?.discordId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const existing = await prisma.submission.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.deletedSubmission.create({
          data: {
            originalId: existing.id,
            opId: existing.opId,
            discordId: existing.discordId,
            discordUsername: existing.discordUsername,
            discordAvatar: existing.discordAvatar,
            ign: existing.ign,
            attending: existing.attending,
            hasPilot: existing.hasPilot,
            pilotName: existing.pilotName,
            hours: existing.hours,
            notes: existing.notes,
            createdAt: existing.createdAt,
            deletedByDiscordId: user.discordId.trim(),
          },
        });

        await tx.submission.delete({ where: { id: params.id } });
      });
    } catch (archiveError) {
      if (isMissingArchiveTable(archiveError)) {
        return NextResponse.json(
          {
            code: "ARCHIVE_NOT_SET_UP",
            error:
              "Submission reset is unavailable until the archive table is created.",
          },
          { status: 503 }
        );
      }
      throw archiveError;
    }

    return NextResponse.json({
      ok: true,
      reset: true,
      resetByDiscordId: user.discordId.trim(),
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    logServerError("Failed to reset submission", error);
    return NextResponse.json(
      { error: "Unable to reset submission." },
      { status: 500 }
    );
  }
}
