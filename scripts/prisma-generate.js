const { spawnSync } = require("node:child_process");

const prismaCli = require.resolve("prisma/build/index.js");
const generateOnlyUrl =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  "postgresql://generate:generate@127.0.0.1:5432/generate";

const result = spawnSync(process.execPath, [prismaCli, "generate"], {
  stdio: "inherit",
  env: { ...process.env, DIRECT_URL: generateOnlyUrl },
});

if (result.error) {
  console.error("Unable to launch Prisma generate:", result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
