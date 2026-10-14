import { PrismaClient } from "@prisma/client";

const PRODUCTION_PROJECT_REF = "gdnpvvtfioiafezuxplk";
const PREVIEW_BLOCKED_DATABASE_URL =
  "postgresql://preview-isolation-blocked:blocked@127.0.0.1:1/postgres";

function getProjectRef(rawUrl: string | undefined): string | null {
  if (!rawUrl) return null;

  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname.startsWith("db.")) {
      return parsed.hostname.slice("db.".length).split(".")[0]?.toLowerCase() ?? null;
    }

    const username = decodeURIComponent(parsed.username);
    return username.match(/\.([a-z0-9]{20})$/i)?.[1]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

const configuredProjectRef = getProjectRef(process.env.DATABASE_URL);
const previewWouldUseProduction =
  process.env.VERCEL_ENV === "preview" &&
  configuredProjectRef === PRODUCTION_PROJECT_REF;

// Fail closed: a Preview deployment must never read or write the live database.
// The diagnostic endpoint separately reports the configured URL so this guard
// cannot make an unsafe URL appear isolated.
if (previewWouldUseProduction) {
  console.error(
    "[database] Preview database access blocked because DATABASE_URL targets Production."
  );
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prismaOptions = previewWouldUseProduction
  ? { datasources: { db: { url: PREVIEW_BLOCKED_DATABASE_URL } } }
  : undefined;

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
