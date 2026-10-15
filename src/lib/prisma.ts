import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const isManualSubmissionsPreview =
  process.env.VERCEL_ENV === "preview" &&
  process.env.VERCEL_GIT_COMMIT_REF === "feature/manual-missing-member-submissions-20261015";

// The feature branch has a dedicated, isolated Preview-only DB secret. It is
// read directly server-side rather than copied into a second environment var.
// All other branches and Production continue to use DATABASE_URL.
const datasourceUrl = isManualSubmissionsPreview
  ? process.env.DIRECT_URL || process.env.DATABASE_URL
  : process.env.DATABASE_URL;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : undefined
  );

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
