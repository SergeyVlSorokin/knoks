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

export const timeEntries = pgTable(
  "time_entry",
  {
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
    includedInvoiceBasisId: uuid("included_invoice_basis_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("time_entry_duration_positive", sql`${table.durationMinutes} between 1 and 1440`),
    check(
      "time_entry_description_valid",
      sql`(${table.description} is null or (${table.description} = btrim(${table.description}) and length(${table.description}) between 1 and 500))`,
    ),
  ],
);

export const timeEntryAuditAction = pgEnum("time_entry_audit_action", ["created", "updated", "deleted"]);

export const timeEntryAudits = pgTable("time_entry_audit", {
  id: uuid("id").defaultRandom().primaryKey(),
  timeEntryId: uuid("time_entry_id").notNull(),
  action: timeEntryAuditAction("action").notNull(),
  actingAccountId: uuid("acting_account_id")
    .notNull()
    .references(() => accounts.id),
  beforeAccountId: uuid("before_account_id"),
  beforeClientId: uuid("before_client_id"),
  beforeWorkDate: date("before_work_date"),
  beforeDurationMinutes: integer("before_duration_minutes"),
  beforeDescription: text("before_description"),
  beforeClassification: timeEntryClassification("before_classification"),
  afterAccountId: uuid("after_account_id"),
  afterClientId: uuid("after_client_id"),
  afterWorkDate: date("after_work_date"),
  afterDurationMinutes: integer("after_duration_minutes"),
  afterDescription: text("after_description"),
  afterClassification: timeEntryClassification("after_classification"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("session", {
  tokenHash: text("token_hash").primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
