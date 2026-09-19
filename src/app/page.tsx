import { auth, signIn } from "@/auth";
import { getRole } from "@/lib/admin";
import { Navbar } from "@/components/navbar";
import { AttendanceForm } from "@/components/attendance-form";
import { prisma } from "@/lib/prisma";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: { authRequired?: string };
}) {
  const session = await auth();
  const settings = await prisma.settings
    .findUnique({ where: { id: 1 } })
    .catch(() => null);
  const guildName = settings?.guildName ?? "Squadron";
  const currentOpId = settings?.currentOpId?.trim() || "current";
  const user = session?.user as any;
  const discordId = typeof user?.discordId === "string" ? user.discordId.trim() : "";

  let role: "owner" | "admin" | "member" = "member";
  try {
    role = await getRole(discordId);
  } catch {
    role = "member";
  }

  const ownSubmission = discordId
    ? await prisma.submission.findUnique({
        where: {
          opId_discordId: {
            opId: currentOpId,
            discordId,
          },
        },
        select: {
          id: true,
          opId: true,
          ign: true,
          attending: true,
          hasPilot: true,
          pilotName: true,
          hours: true,
          notes: true,
          discordAvatar: true,
          createdAt: true,
        },
      }).catch(() => null)
    : null;

  return (
    <div className="min-h-screen">
      <Navbar guildName={guildName} />

      <main className="mx-auto flex w-full max-w-3xl flex-col px-4 py-8 sm:px-6 sm:py-12">
        {session?.user ? (
          <>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan">
                  Current operation
                </p>
                <h1 className="font-display text-2xl tracking-tight text-ink">
                  Attendance report
                </h1>
                <p className="mt-1.5 max-w-xl text-sm leading-6 text-ink2">
                  Log your status for this op. Your response is tied to your Discord account.
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span className="rounded-full border border-line bg-panel2 px-3 py-1.5 font-display text-xs text-ink2">
                  {currentOpId}
                </span>
                <div className="flex min-h-11 items-center gap-2 rounded-full border border-line bg-panel2 px-3 py-1.5">
                  {user.avatar ? (
                    <Image
                      src={user.avatar}
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 rounded-full border border-line"
                    />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-panel text-xs font-medium text-ink2">
                      {(user.username ?? "?").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-ink2">Submitting as</p>
                    <p className="max-w-36 truncate text-sm font-medium text-ink">{user.username}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mx-auto w-full">
              <AttendanceForm
                initialSubmission={
                  ownSubmission
                    ? {
                        id: ownSubmission.id,
                        opId: ownSubmission.opId,
                        ign: ownSubmission.ign,
                        attending: ownSubmission.attending,
                        hasPilot: ownSubmission.hasPilot,
                        pilotName: ownSubmission.pilotName,
                        hours: ownSubmission.hours,
                        notes: ownSubmission.notes,
                        createdAt: ownSubmission.createdAt.toISOString(),
                        discordAvatar: ownSubmission.discordAvatar,
                      }
                    : null
                }
                role={role}
              />
            </div>
          </>
        ) : (
          <div className="premium-card p-7 sm:p-9">
            <div className="mb-5 inline-flex rounded-full border border-cyan/30 bg-cyan/5 px-3 py-1 text-xs font-medium text-cyan">
              Discord verification
            </div>
            {searchParams.authRequired && (
              <p className="mb-4 rounded-md border border-cyan/30 bg-cyan/5 px-3 py-2 text-sm text-cyan">
                Sign in to continue.
              </p>
            )}
            <h1 className="font-display text-2xl tracking-tight text-ink">
              Sign in to report attendance
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-ink2">
              Use your Discord account to submit your IGN, attendance and pilot status for
              this op.
            </p>
            <form
              action={async () => {
                "use server";
                await signIn("discord");
              }}
              className="mt-7"
            >
              <button className="premium-button w-full sm:w-auto">
                Sign in with Discord
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
