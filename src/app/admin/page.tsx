import { auth } from "@/auth";
import type { Metadata } from "next";
import { isAdmin, isOwner } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { AdminDashboard } from "@/components/admin-dashboard";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  const session = await auth();
  const user = session?.user as any;

  if (!(await isAdmin(user?.discordId))) {
    redirect("/");
  }

  const settings = await prisma.settings
    .findUnique({ where: { id: 1 } })
    .catch(() => null);
  const guildName = settings?.guildName ?? "Squadron";

  return (
    <div className="site-page">
      <Navbar guildName={guildName} />
      <main className="mx-auto w-full max-w-5xl px-5 py-6 sm:py-8">
        <div className="shrink-0">
          <h1 className="font-display text-xl text-ink">Admin console</h1>
          <p className="mt-1 text-sm text-ink2">Submissions, notifications and access control.</p>
        </div>
        <div className="mt-6">
          <AdminDashboard isOwner={isOwner(user)} />
        </div>
      </main>
    </div>
  );
}
