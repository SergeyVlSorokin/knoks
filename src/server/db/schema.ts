import {
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const accountRole = pgEnum("account_role", ["member", "administrator"]);
export type AccountRole = (typeof accountRole.enumValues)[number];

export const companyWorkspace = pgTable(
  "company_workspace",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
  },
  (table) => [check("single_company_workspace", sql`${table.id} = 1`)],
);

export const accounts = pgTable("account", {
  id: uuid("id").defaultRandom().primaryKey(),
  displayName: text("display_name").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: accountRole("role").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clients = pgTable(
  "client",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    displayName: text("display_name").notNull(),
    archived: boolean("archived").notNull().default(false),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("client_display_name_trimmed", sql`${table.displayName} = btrim(${table.displayName})`),
    check("client_display_name_not_blank", sql`length(${table.displayName}) > 0`),
    uniqueIndex("client_display_name_case_insensitive").on(sql`lower(${table.displayName})`),
  ],
);

export const sessions = pgTable("session", {
  tokenHash: text("token_hash").primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
