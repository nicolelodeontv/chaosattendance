import { auth, signIn } from "@/auth";
import { Navbar } from "@/components/navbar";
import { AttendanceForm } from "@/components/attendance-form";
import { prisma } from "@/lib/prisma";

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

  return (
    <div className="min-h-screen">
      <Navbar guildName={guildName} />

      <main className="mx-auto max-w-3xl px-5 py-14">
        {session?.user ? (
          <>
            <div className="mb-6">
              <h1 className="font-display text-xl text-ink">Attendance report</h1>
              <p className="mt-1 text-sm text-ink2">
                Log your status for this op. Submitting notifies the server.
              </p>
            </div>
            <AttendanceForm />
          </>
        ) : (
          <div className="rounded border border-line bg-panel p-8 text-center">
            {searchParams.authRequired && (
              <p className="mb-4 text-sm text-amber">Sign in to continue.</p>
            )}
            <h1 className="font-display text-lg text-ink">Sign in to report attendance</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink2">
              Use your Discord account to submit your IGN, attendance and pilot status for
              this op.
            </p>
            <form
              action={async () => {
                "use server";
                await signIn("discord");
              }}
              className="mt-6"
            >
              <button className="rounded border border-amber bg-amber/10 px-5 py-2.5 font-display text-sm text-amber transition-colors hover:bg-amber/20">
                Sign in with Discord
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
