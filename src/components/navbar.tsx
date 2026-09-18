import { auth, signIn, signOut } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { ThemeToggle } from "./theme-toggle";
import Image from "next/image";

export async function Navbar({ guildName }: { guildName: string }) {
  const session = await auth();
  const user = session?.user as any;
  const admin = await isAdmin(user?.discordId);

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="status-dot" style={{ backgroundColor: "rgb(var(--cyan))" }} />
          <span className="font-display text-sm tracking-tight text-ink">
            {guildName} <span className="text-ink2">/ attendance</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {admin && (
            <a
              href="/admin"
              className="text-sm text-ink2 transition-colors hover:text-cyan"
            >
              Admin
            </a>
          )}
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2.5">
              {user.avatar && (
                <Image
                  src={user.avatar}
                  alt={user.username}
                  width={26}
                  height={26}
                  className="rounded-full border border-line"
                />
              )}
              <span className="hidden text-sm text-ink2 sm:inline">{user.username}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="text-sm text-ink2 transition-colors hover:text-red">
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn("discord");
              }}
            >
              <button className="rounded border border-line bg-panel2 px-3 py-1.5 text-sm text-ink transition-colors hover:border-cyan hover:text-cyan">
                Sign in with Discord
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
