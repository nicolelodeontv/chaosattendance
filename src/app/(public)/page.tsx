import { auth } from "@/auth";
import { DiscordSignInButton } from "@/components/discord-sign-in-button";
import { RetryMembershipButton } from "@/components/retry-membership-button";
import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { AttendanceForm } from "@/components/attendance-form";
import { prisma } from "@/lib/prisma";
import { checkDiscordGuildMembership } from "@/lib/discord-membership";
import Image from "next/image";

export const dynamic = "force-dynamic";

const MEMBER_CACHE_TTL_MS = 60_000;
const memberCache = new Map<string, number>();

function hasFreshMemberCache(discordId: string): boolean {
  const expiresAt = memberCache.get(discordId);

  if (!expiresAt) return false;

  if (expiresAt <= Date.now()) {
    memberCache.delete(discordId);
    return false;
  }

  return true;
}

async function getMembership(
  discordId: string
): Promise<"member" | "not_member" | "unavailable"> {
  // This cache is per Vercel serverless instance. Instances do not share it,
  // and it is reset on cold starts, so the 60-second cache only reduces
  // repeated Discord lookups when requests land on the same warm instance.
  if (hasFreshMemberCache(discordId)) {
    return "member";
  }

  const membership = await checkDiscordGuildMembership(discordId);

  // Cache ONLY positive membership results. Never cache not_member or
  // unavailable so a newly joined member can gain access promptly and
  // temporary Discord failures do not extend an outage.
  if (membership === "member") {
    memberCache.set(discordId, Date.now() + MEMBER_CACHE_TTL_MS);
  }

  return membership;
}

export async function generateMetadata(): Promise<Metadata> {
  const session = await auth();
  return {
    title: session?.user ? "Report attendance" : "Sign in",
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: { authRequired?: string; error?: string };
}) {
  const session = await auth();
  const settings = await prisma.settings
    .findUnique({ where: { id: 1 } })
    .catch(() => null);
  const guildName = settings?.guildName ?? "Squadron";
  const currentOpId = settings?.currentOpId?.trim() || "current";
  const user = session?.user as any;
  const discordId = typeof user?.discordId === "string" ? user.discordId.trim() : "";
  const membership = session?.user && discordId
    ? await getMembership(discordId)
    : null;
  const isChaosMember = membership === "member";
  console.info("[attendance-page] membership gate", {
    branch:
      membership === "member"
        ? "member"
        : membership === "not_member"
          ? "not_member"
          : "unavailable",
  });

  const ownSubmission = isChaosMember
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
    <div className={session?.user ? "site-page" : "site-page sign-in-page"}>
      <Navbar guildName={guildName} />

      <main
        className={[
          "relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 sm:px-6 sm:py-12",
          "py-8",
        ].join(" ")}
      >
        {session?.user ? (
          isChaosMember ? (
          <div>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-orange">
                  Current operation
                </p>
                <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
                  Attendance report
                </h1>
                <p className="mt-1.5 max-w-xl text-sm leading-6 text-ink2">
                  Log your status for this op. Your response is tied to your Discord account.
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span className="inline-flex h-8 items-center rounded-full border border-line bg-panel2 px-3 font-mono text-xs text-ink2">
                  {currentOpId}
                </span>
                <div className="inline-flex h-8 max-w-full shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-panel2 px-2.5 font-mono text-xs">
                  {user.avatar ? (
                    <Image
                      src={user.avatar}
                      alt=""
                      width={20}
                      height={20}
                      className="h-5 w-5 shrink-0 rounded-full border border-line"
                    />
                  ) : (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line bg-panel text-[11px] font-medium text-ink2">
                      {(user.username ?? "?").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="submitting-as-label text-ink2">Submitting as</span>
                  <span className="min-w-0 max-w-[140px] truncate font-semibold text-ink">{user.username}</span>
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
              />
            </div>
          </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="premium-card mx-auto w-full max-w-[460px] px-8 pb-8 pt-10 text-center">
                <h1 className="font-display text-[22px] font-bold tracking-[0.2px] text-ink">
                  {membership === "unavailable"
                    ? "We couldn't verify your Chaos membership."
                    : "You're not a member of this clan"}
                </h1>
                <p className="mx-auto mt-2 max-w-[44ch] text-sm leading-[1.5] text-ink2">
                  {membership === "unavailable"
                    ? "We couldn't verify your Chaos membership. Please try again."
                    : "Your Discord account isn't in the Chaos server, so you can't submit attendance. Join the server, then come back and reload."}
                </p>
                {membership === "unavailable" && <RetryMembershipButton />}
              </div>
            </div>
          )
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="premium-card mx-auto w-full max-w-[380px] px-8 pb-8 pt-10 text-center">
              <div className="mx-auto mb-[22px] flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-2xl bg-black shadow-[0_0_0_1px_var(--red-deep),0_0_26px_rgba(249,115,22,0.5)]">
                <Image
                  src="/chaos-clan-logo.jpg"
                  alt="Chaos clan logo"
                  width={88}
                  height={88}
                  priority
                  className="h-full w-full object-cover"
                />
              </div>

              <h1 className="font-display text-[22px] font-bold tracking-[0.2px] text-ink">
                Sign in to report attendance
              </h1>
              <p className="mx-auto mb-0 mt-2 max-w-[44ch] text-sm leading-[1.5] text-ink2">
                Use your Discord account to submit your IGN, attendance and pilot status for
                this op.
              </p>

              {searchParams.authRequired && (
                <p className="mb-0 mt-4 rounded-md border border-orange/30 bg-orange/5 px-3 py-2 text-sm text-orange">
                  Sign in to continue.
                </p>
              )}

              {searchParams.error === "AccessDenied" && (
                <p className="mb-0 mt-4 rounded-md border border-red/30 bg-red/5 px-3 py-2 text-sm text-red">
                  You must be a member of the Chaos Discord server to sign in.
                </p>
              )}

              <DiscordSignInButton />

              <p className="mx-auto mt-3 max-w-[48ch] text-xs leading-5 text-ink2">
                Discord requests only the <span className="font-mono text-ink">identify</span> scope.
                We store your Discord ID, username, IGN, attendance, pilot status, hours, and notes.
              </p>

              <div className="auth-divider">
                <span className="dot" />
                DISCORD VERIFICATION
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
