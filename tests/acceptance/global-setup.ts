import { execFileSync } from "node:child_process";
import postgres from "postgres";

export default async function globalSetup() {
  const env = {
    ...process.env,
    DATABASE_URL:
      process.env.DATABASE_URL ??
      "postgres://consulting_time:consulting_time@127.0.0.1:55432/consulting_time",
    WORKSPACE_NAME: "Northstar Consulting",
    ADMIN_DISPLAY_NAME: "Ada Admin",
    ADMIN_USERNAME: "ada",
    ADMIN_PASSWORD: "correct horse battery staple",
  };

  execFileSync("corepack", ["pnpm", "db:migrate"], {
    env,
    stdio: "inherit",
    shell: true,
  });
  const client = postgres(env.DATABASE_URL, { max: 1 });
  try {
    await client`truncate table session, account, company_workspace cascade`;
  } finally {
    await client.end();
  }
  execFileSync("corepack", ["pnpm", "provision"], {
    env,
    stdio: "inherit",
    shell: true,
  });
}
