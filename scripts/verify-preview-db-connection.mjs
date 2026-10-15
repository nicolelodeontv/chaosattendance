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

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  console.error("Preview database check failed: DATABASE_URL is missing.");
  process.exit(1);
}

let url;
try {
  url = new URL(rawUrl);
} catch {
  console.error("Preview database check failed: DATABASE_URL is not a valid URL.");
  process.exit(1);
}

if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
  console.error("Preview database check failed: DATABASE_URL is not PostgreSQL.");
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
    "Preview database check refused: URL target does not match the isolated CHAOS Attendance Preview project.",
    JSON.stringify({ host, port: url.port || "(default)", projectRef: projectRef ?? "unverified" })
  );
  process.exit(1);
}

if (!isPooler || url.port !== "6543") {
  console.error(
    "Preview database check refused: Vercel Preview requires the isolated project's transaction-pooler URL on port 6543.",
    JSON.stringify({ host, port: url.port || "(default)", projectRef })
  );
  process.exit(1);
}

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

try {
  const rows = await prisma.$queryRawUnsafe(
    "SELECT current_database()::text AS database, current_user::text AS role"
  );
  console.log(
    "Preview database connection verified (read-only).",
    JSON.stringify({ host, port: url.port, projectRef, database: rows[0]?.database, role: rows[0]?.role })
  );
} catch (error) {
  const code =
    error && typeof error === "object" && "code" in error && typeof error.code === "string"
      ? error.code
      : "connection_error";
  console.error("Preview database connection failed.", JSON.stringify({ host, port: url.port, projectRef, code }));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
