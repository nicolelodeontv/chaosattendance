import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PRODUCTION_PROJECT_REF = "gdnpvvtfioiafezuxplk";

export async function GET() {
  // This temporary diagnostic is intentionally unavailable on Production.
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    return NextResponse.json({
      configured: false,
      databaseReachable: false,
      databaseIsProduction: null,
      projectRef: null,
      connectionType: "unknown",
      port: null,
    });
  }

  try {
    const parsed = new URL(rawUrl);
    const username = decodeURIComponent(parsed.username);
    let projectRef: string | null = null;

    if (parsed.hostname.startsWith("db.")) {
      projectRef = parsed.hostname.slice("db.".length).split(".")[0] || null;
    } else {
      // Supavisor shared pooler usernames include postgres.<project-ref>.
      const match = username.match(/\.([a-z0-9]{20})$/i);
      projectRef = match?.[1] ?? null;
    }

    const port =
      parsed.port || (parsed.protocol === "postgresql:" ? "5432" : null);
    let connectionType = "unknown";
    if (parsed.hostname.includes("pooler.supabase.com") && port === "6543") {
      connectionType = "transaction pooler";
    } else if (
      parsed.hostname.includes("pooler.supabase.com") &&
      port === "5432"
    ) {
      connectionType = "session pooler";
    } else if (parsed.hostname.startsWith("db.")) {
      connectionType = "direct";
    }

    // Prove the application's connection works without reading any app data.
    let databaseReachable = false;
    try {
      await prisma.$queryRaw`SELECT current_database()`;
      databaseReachable = true;
    } catch {
      databaseReachable = false;
    }

    return NextResponse.json({
      configured: true,
      databaseReachable,
      databaseIsProduction:
        projectRef === null ? null : projectRef === PRODUCTION_PROJECT_REF,
      projectRef,
      connectionType,
      port,
    });
  } catch {
    return NextResponse.json({
      configured: true,
      databaseReachable: false,
      databaseIsProduction: null,
      projectRef: null,
      connectionType: "unparseable",
      port: null,
    });
  }
}
