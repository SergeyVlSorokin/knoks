import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";

import { hashPassword } from "../src/server/access/password";
import { accounts, companyWorkspace } from "../src/server/db/schema";

const input = z
  .object({
    DATABASE_URL: z.string().min(1),
    WORKSPACE_NAME: z.string().trim().min(1),
    ADMIN_DISPLAY_NAME: z.string().trim().min(1),
    ADMIN_USERNAME: z.string().trim().min(1),
    ADMIN_PASSWORD: z.string().min(12).optional(),
  })
  .parse(process.env);

const client = postgres(input.DATABASE_URL, { max: 1 });
const database = drizzle(client);

try {
  const initialPassword =
    input.ADMIN_PASSWORD ?? randomBytes(18).toString("base64url");
  const passwordHash = await hashPassword(initialPassword);
  await database.transaction(async (transaction) => {
    await transaction.execute(sql`set transaction isolation level serializable`);

    await transaction.insert(companyWorkspace).values({
      id: 1,
      name: input.WORKSPACE_NAME,
    });
    await transaction.insert(accounts).values({
      displayName: input.ADMIN_DISPLAY_NAME,
      username: input.ADMIN_USERNAME,
      passwordHash,
      role: "administrator",
    });
  });
  console.log(`Provisioned ${input.WORKSPACE_NAME} for ${input.ADMIN_USERNAME}`);
  if (!input.ADMIN_PASSWORD) {
    console.log(`Initial Administrator password: ${initialPassword}`);
  }
} finally {
  await client.end();
}
