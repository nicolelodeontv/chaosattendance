import { auth } from "@/auth";
import type { Metadata } from "next";
import { getAccessLevel } from "@/lib/admin-access";
import { canAccessTab, isAdminTab, type AdminTab } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { AdminDashboard } from "@/components/admin-dashboard";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const session = await auth();
  const accessLevel = await getAccessLevel(session);

  if (!accessLevel) {
    redirect("/");
  }

  const requestedTab = searchParams?.tab;
  if (
    requestedTab &&
    (!isAdminTab(requestedTab) || !canAccessTab(accessLevel, requestedTab))
  ) {
    redirect("/admin?tab=submissions");
  }
  const initialTab: AdminTab =
    requestedTab && isAdminTab(requestedTab) ? requestedTab : "submissions";

  const settings = await prisma.settings
    .findUnique({ where: { id: 1 } })
    .catch(() => null);
  const guildName = settings?.guildName ?? "Squadron";

  return (
    <div className="site-page">
      <Navbar guildName={guildName} />
      <main className="mx-auto w-full max-w-[1400px] px-5 py-6 sm:py-8">
        <div className="shrink-0">
          <h1 className="font-display text-xl text-ink">Admin console</h1>
          <p className="mt-1 text-sm text-ink2">Submissions, notifications and access control.</p>
        </div>
        <div className="mt-6">
          <AdminDashboard accessLevel={accessLevel} initialTab={initialTab} />
        </div>
      </main>
    </div>
  );
}
