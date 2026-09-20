import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwner } from "@/lib/admin";

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
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    await prisma.submission.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    console.error("Failed to delete submission", error);
    return NextResponse.json({ error: "Unable to delete submission." }, { status: 500 });
  }
}
