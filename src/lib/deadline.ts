import { prisma } from "@/lib/prisma";

export function isPastDeadline(
  deadline: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!deadline) return false;

  const deadlineDate =
    deadline instanceof Date ? deadline : new Date(deadline);

  if (Number.isNaN(deadlineDate.getTime())) return false;

  return deadlineDate.getTime() <= now.getTime();
}

export async function getSubmissionDeadline(): Promise<Date | null> {
  const settings = await prisma.settings.findUnique({
    where: { id: 1 },
    select: { submissionDeadline: true },
  });

  return settings?.submissionDeadline ?? null;
}
