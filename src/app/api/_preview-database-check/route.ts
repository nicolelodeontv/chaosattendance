import { NextResponse } from "next/server";

const PRODUCTION_SUPABASE_REF = "gdnpvvtfioiafezuxplk";

// Temporary diagnostic for this preview only. Never return connection details.
export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const connectionString = process.env.DATABASE_URL ?? "";
  let connectionUrl: URL | null = null;
  try {
    connectionUrl = new URL(connectionString);
  } catch {
    // Report only whether a usable connection string is configured.
  }

  const hostname = connectionUrl?.hostname ?? "";
  const username = connectionUrl ? decodeURIComponent(connectionUrl.username) : "";
  const port = connectionUrl?.port ?? "";
  const directRef = /^db\.([a-z0-9]+)\.supabase\.co$/i.exec(hostname)?.[1] ?? "";
  const pooledRef = /postgres\.([a-z0-9]+)/i.exec(username)?.[1] ?? "";
  const projectRef = directRef || pooledRef;
  const isSupabasePooler = hostname.endsWith(".pooler.supabase.com");
  const usesSessionPooler6543 = isSupabasePooler && port === "6543";

  return NextResponse.json({
    configured: Boolean(connectionString),
    databaseIsProduction: projectRef === PRODUCTION_SUPABASE_REF,
    connectionType: isSupabasePooler
      ? usesSessionPooler6543
        ? "Supabase pooler, port 6543"
        : "Supabase pooler, other port"
      : directRef
        ? "Supabase direct database host"
        : connectionString
          ? "Other or unrecognized PostgreSQL host"
          : "Not configured",
    port: port || null,
  });
}
