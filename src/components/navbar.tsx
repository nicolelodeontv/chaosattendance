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
    <header className="border-b border-line/80 bg-base/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="min-w-0 flex shrink items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60"
          aria-label="Back to attendance"
        >
          <span
            className="status-dot h-2 w-2 shrink-0 shadow-[0_0_14px_rgb(var(--cyan)/0.65)]"
            style={{ backgroundColor: "rgb(var(--cyan))" }}
          />
          <span className="min-w-0 truncate font-display text-sm tracking-tight text-ink">
            {guildName} <span className="text-ink2">/ attendance</span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          {admin && (
            <Link
              href="/admin"
              className="premium-button-secondary h-8 !min-h-8 shrink-0 px-3 py-0 text-xs whitespace-nowrap"
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
                  className="h-7 w-7 shrink-0 rounded-full border border-line shadow-sm"
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
                  className="premium-button-secondary h-8 !min-h-8 shrink-0 px-3 py-0 text-xs whitespace-nowrap"
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
