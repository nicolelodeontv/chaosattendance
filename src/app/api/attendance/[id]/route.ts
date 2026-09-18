import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const user = session?.user as any;
  if (!(await isAdmin(user?.discordId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.submission.delete({ where: { id: params.id } }).catch(() => null);

  return NextResponse.json({ ok: true });
}
