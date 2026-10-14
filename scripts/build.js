const { spawnSync } = require("node:child_process");

function runNode(cliPath, args, env = process.env) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    stdio: "inherit",
    env,
  });

  if (result.error) {
    console.error(`Unable to launch ${cliPath}:`, result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const prismaCli = require.resolve("prisma/build/index.js");
const nextCli = require.resolve("next/dist/bin/next");

// Schema validation during client generation needs DIRECT_URL to be defined,
// but generating Prisma Client does not connect to the database. Use the
// runtime URL as a build-time fallback only; migrations below require DIRECT_URL.
const generateUrl =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  "postgresql://generate:generate@127.0.0.1:5432/generate";

runNode(prismaCli, ["generate"], {
  ...process.env,
  DIRECT_URL: generateUrl,
});

// Migrations are deliberately opt-in and Preview-only. Production builds never
// run migrations automatically, protecting the live database from build-time DDL.
if (
  process.env.VERCEL_ENV === "preview" &&
  process.env.PREVIEW_DB_MIGRATIONS_ENABLED === "true"
) {
  if (!process.env.DIRECT_URL?.trim()) {
    console.error(
      "Preview migrations are enabled, but DIRECT_URL is missing. Refusing to migrate."
    );
    process.exit(1);
  }
  runNode(prismaCli, ["migrate", "deploy"], process.env);
}

runNode(nextCli, ["build"], process.env);
