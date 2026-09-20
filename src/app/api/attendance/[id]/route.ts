import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwner } from "@/lib/admin";
import { logServerError } from "@/lib/server-error";

function isMissingArchiveTable(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021"
  );
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const user = session?.user as any;

  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!isOwner({ discordId: user?.discordId })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const existing = await prisma.submission.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
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
      if (!isMissingArchiveTable(archiveError)) {
        throw archiveError;
      }

      logServerError(
        "DeletedSubmission archive table is missing; deleting without archive.",
        archiveError
      );
      try {
        await prisma.submission.delete({ where: { id: params.id } });
      } catch (deleteError) {
        if (
          deleteError instanceof Prisma.PrismaClientKnownRequestError &&
          deleteError.code === "P2025"
        ) {
          return NextResponse.json({ error: "Submission not found" }, { status: 404 });
        }
        throw deleteError;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    logServerError("Failed to delete submission", error);
    return NextResponse.json({ error: "Unable to delete submission." }, { status: 500 });
  }
}
