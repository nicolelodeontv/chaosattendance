import { auth } from "@/auth";
import { isAdmin, isOwner } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { AdminDashboard } from "@/components/admin-dashboard";
import { redirect } from "next/navigation";

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
    <div className="min-h-screen">
      <Navbar guildName={guildName} />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="font-display text-xl text-ink">Admin console</h1>
        <p className="mt-1 text-sm text-ink2">Submissions, notifications and access control.</p>
        <div className="mt-8">
          <AdminDashboard isOwner={isOwner(user)} />
        </div>
      </main>
    </div>
  );
}
