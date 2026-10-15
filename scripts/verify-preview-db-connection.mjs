// Guarded, read-only Preview DB check for PR #54.
// This only runs on the dedicated feature preview branch. It refuses direct
// endpoints, unknown hosts, and any project ref other than CHAOS Attendance Preview.
const targetBranch = "feature/manual-missing-member-submissions-20261015";
const expectedProjectRef = "hfsydxrpvlguwwlhgrbo";

if (
  process.env.VERCEL_ENV !== "preview" ||
  process.env.VERCEL_GIT_COMMIT_REF !== targetBranch
) {
  process.exit(0);
}

// The pre-existing Preview DIRECT_URL is sensitive and intentionally unreadable
// from control-plane tools. Use it directly rather than relying on env-var
// interpolation inside the temporary branch-only DATABASE_URL override.
const rawUrl = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL;
if (!rawUrl) {
  console.error("Preview database check failed: no connection URL is configured.");
  process.exit(1);
}

let url;
try {
  url = new URL(rawUrl);
} catch {
  console.error("Preview database check failed: configured connection is not a valid URL.");
  process.exit(1);
}

if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
  console.error("Preview database check failed: configured connection is not PostgreSQL.");
  process.exit(1);
}

const host = url.hostname.toLowerCase();
const isPooler = host.endsWith(".pooler.supabase.com");
const isDirect = /^db\.([a-z0-9]+)\.supabase\.co$/.test(host);
let projectRef = null;

if (isPooler) {
  const username = decodeURIComponent(url.username);
  if (username === "postgres." + expectedProjectRef) {
    projectRef = expectedProjectRef;
  }
} else if (isDirect) {
  projectRef = host.match(/^db\.([a-z0-9]+)\.supabase\.co$/)?.[1] ?? null;
}

if (projectRef !== expectedProjectRef) {
  console.error(
    "Preview database check refused: connection target does not match the isolated Preview project.",
    JSON.stringify({ host, port: url.port || "(default)", projectRef: projectRef ?? "unverified" })
  );
  process.exit(1);
}

if (!isPooler || !["5432", "6543"].includes(url.port)) {
  console.error(
    "Preview database check refused: the isolated Preview connection must use a recognized Supabase pooler port (5432 or 6543).",
    JSON.stringify({ host, port: url.port || "(default)", projectRef })
  );
  process.exit(1);
}

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient({ datasources: { db: { url: rawUrl } } });

try {
  const rows = await prisma.$queryRawUnsafe(
    "SELECT current_database()::text AS database, current_user::text AS role"
  );
  console.log(
    "Preview database connection verified (read-only).",
    JSON.stringify({ host, port: url.port, projectRef, database: rows[0]?.database, role: rows[0]?.role })
  );
} catch (error) {
  const item = error && typeof error === "object" ? error : {};
  const code = "code" in item && typeof item.code === "string" ? item.code : "connection_error";
  const name = "name" in item && typeof item.name === "string" ? item.name : "Error";
  let message = "message" in item && typeof item.message === "string" ? item.message : "";
  message = message
    .replace(/postgres(?:ql)?:\/\/[^\s@]+@/gi, "postgresql://[REDACTED]@")
    .slice(0, 240);
  console.error(
    "Preview database connection failed.",
    JSON.stringify({ host, port: url.port, projectRef, code, name, message })
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
