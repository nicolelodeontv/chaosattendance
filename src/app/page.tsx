import { auth, signIn } from "@/auth";
import { Navbar } from "@/components/navbar";
import { AttendanceForm } from "@/components/attendance-form";
import { prisma } from "@/lib/prisma";

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
  const discordId = typeof (session?.user as any)?.discordId === "string"
    ? (session?.user as any).discordId.trim()
    : "";
  const ownSubmission = discordId
    ? await prisma.submission.findFirst({
        where: { opId: currentOpId, discordId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          ign: true,
          attending: true,
          hasPilot: true,
          pilotName: true,
          hours: true,
          notes: true,
        },
      })
    : null;

  return (
    <div className="min-h-screen">
      <Navbar guildName={guildName} />

      <main className="mx-auto flex w-full max-w-3xl flex-col px-4 py-10 sm:px-6 sm:py-14">
        {session?.user ? (
          <>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan">
                  Current operation
                </p>
                <h1 className="font-display text-2xl tracking-tight text-ink">
                  Attendance report
                </h1>
                <p className="mt-1.5 text-sm leading-6 text-ink2">
                  Log your status for this op. Your response is tied to your Discord account.
                </p>
              </div>
              <span className="w-fit rounded-full border border-line bg-panel2 px-3 py-1.5 font-display text-xs text-ink2">
                {currentOpId}
              </span>
            </div>
            <div className="mx-auto w-full"><AttendanceForm initialSubmission={ownSubmission} /></div>
          </>
        ) : (
          <div className="premium-card p-7 sm:p-9">
            <div className="mb-5 inline-flex rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1 text-xs font-medium text-cyan">
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
