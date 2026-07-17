import {
  boolean,
  check,
  date,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const accountRole = pgEnum("account_role", ["member", "administrator"]);
export type AccountRole = (typeof accountRole.enumValues)[number];

export const timeEntryClassification = pgEnum("time_entry_classification", [
  "billable",
  "non_billable",
]);

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

export const standingClientRows = pgTable(
  "standing_client_row",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.accountId, table.clientId] })],
);

export const timeEntries = pgTable("time_entry", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  workDate: date("work_date").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  description: text("description"),
  classification: timeEntryClassification("classification").notNull(),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("session", {
  tokenHash: text("token_hash").primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
