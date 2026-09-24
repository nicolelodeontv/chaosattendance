import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/server-error";

export const SUBMISSIONS_CLOSED_ERROR = "Submissions are closed for this op.";
export const SUBMISSIONS_CLOSED_CODE = "SUBMISSIONS_CLOSED";

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
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 1 },
      select: { submissionDeadline: true },
    });

    return settings?.submissionDeadline ?? null;
  } catch (error) {
    logServerError("Unable to read submission deadline:", error);
    return null;
  }
}
