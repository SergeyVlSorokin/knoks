import { defineConfig, devices } from "@playwright/test";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgres://consulting_time:consulting_time@127.0.0.1:55432/consulting_time";

export default defineConfig({
  testDir: "./tests/acceptance",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  globalSetup: "./tests/acceptance/global-setup.ts",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "corepack pnpm dev",
    url: "http://127.0.0.1:3000/sign-in",
    reuseExistingServer: false,
    env: {
      DATABASE_URL: databaseUrl,
      NODE_ENV: "test",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
