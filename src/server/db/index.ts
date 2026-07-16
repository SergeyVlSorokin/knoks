import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalDatabase = globalThis as typeof globalThis & {
  postgresClient?: postgres.Sql;
};

const client =
  globalDatabase.postgresClient ??
  postgres(databaseUrl, {
    max: process.env.NODE_ENV === "production" ? 5 : 1,
  });

if (process.env.NODE_ENV !== "production") {
  globalDatabase.postgresClient = client;
}

export const db = drizzle(client, { schema });
