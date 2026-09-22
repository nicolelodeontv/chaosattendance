import { auth, signOut } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { ThemeToggle } from "./theme-toggle";
import Image from "next/image";
import Link from "next/link";

export async function Navbar({ guildName }: { guildName: string }) {
  const session = await auth();
  const user = session?.user as any;
  const admin = await isAdmin(user?.discordId);

  return (
    <header className="relative z-10 border-b border-line bg-transparent">
      <div className="mx-auto flex w-full items-center justify-between gap-3 px-5 py-[18px] sm:px-6">
        <Link
          href="/"
          className="min-w-0 flex shrink items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40"
          aria-label="Back to attendance"
        >
          <Image
            src="/chaos-clan-logo.jpg"
            alt="Chaos clan logo"
            width={30}
            height={30}
            priority
            className="h-[30px] w-[30px] shrink-0 rounded-md object-cover shadow-[0_0_10px_rgba(249,115,22,0.4)]"
          />
          <span className="min-w-0 truncate font-mono text-[13px] tracking-[0.04em] text-ink2">
            <span className="font-semibold text-orange-soft">{guildName}</span>
            <span className="text-ink2"> / attendance</span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          {admin && (
            <Link
              href="/admin"
              className="premium-button-secondary h-8 !min-h-8 shrink-0 whitespace-nowrap px-3 py-0 text-xs"
            >
              Admin
            </Link>
          )}

          <ThemeToggle />

          {user && (
            <div className="flex shrink-0 items-center gap-2 border-l border-line pl-2">
              {user.avatar && (
                <Image
                  src={user.avatar}
                  alt={user.username}
                  width={28}
                  height={28}
                  className="h-7 w-7 shrink-0 rounded-full border border-line"
                />
              )}
              <span className="hidden max-w-[120px] truncate text-sm text-ink2 min-[400px]:inline">
                {user.username}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="premium-button-secondary h-8 !min-h-8 shrink-0 whitespace-nowrap px-3 py-0 text-xs"
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
