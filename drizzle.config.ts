import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgres://consulting_time:consulting_time@127.0.0.1:55432/consulting_time",
  },
  strict: true,
  verbose: true,
});
