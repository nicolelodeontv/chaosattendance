import { auth, signOut } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { ThemeToggle } from "./theme-toggle";
import Image from "next/image";

export async function Navbar({ guildName }: { guildName: string }) {
  const session = await auth();
  const user = session?.user as any;
  const admin = await isAdmin(user?.discordId);

  return (
    <header className="border-b border-line/80 bg-base/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span
            className="status-dot h-2 w-2 shadow-[0_0_14px_rgb(var(--cyan)/0.65)]"
            style={{ backgroundColor: "rgb(var(--cyan))" }}
          />
          <span className="font-display text-sm tracking-tight text-ink">
            {guildName} <span className="text-ink2">/ attendance</span>
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {admin && (
            <a
              href="/admin"
              className="rounded-md px-2.5 py-1.5 text-sm text-ink2 transition-colors hover:bg-panel2 hover:text-cyan"
            >
              Admin
            </a>
          )}
          <ThemeToggle />
          {user && (
            <div className="flex items-center gap-2.5 border-l border-line pl-2.5">
              {user.avatar && (
                <Image
                  src={user.avatar}
                  alt={user.username}
                  width={28}
                  height={28}
                  className="rounded-full border border-line shadow-sm"
                />
              )}
              <span className="hidden text-sm text-ink2 sm:inline">{user.username}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="rounded-md px-2 py-1.5 text-sm text-ink2 transition-colors hover:bg-red/5 hover:text-red">
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
