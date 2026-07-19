CREATE TYPE "public"."time_entry_audit_action" AS ENUM('created', 'updated', 'deleted');--> statement-breakpoint
CREATE TABLE "time_entry_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"time_entry_id" uuid NOT NULL,
	"action" time_entry_audit_action NOT NULL,
	"acting_account_id" uuid NOT NULL,
	"before_account_id" uuid,
	"before_client_id" uuid,
	"before_work_date" date,
	"before_duration_minutes" integer,
	"before_description" text,
	"before_classification" time_entry_classification,
	"after_account_id" uuid,
	"after_client_id" uuid,
	"after_work_date" date,
	"after_duration_minutes" integer,
	"after_description" text,
	"after_classification" time_entry_classification,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "time_entry" ADD COLUMN "included_invoice_basis_id" uuid;--> statement-breakpoint
ALTER TABLE "time_entry_audit" ADD CONSTRAINT "time_entry_audit_acting_account_id_account_id_fk" FOREIGN KEY ("acting_account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entry" ADD CONSTRAINT "time_entry_duration_positive" CHECK ("time_entry"."duration_minutes" between 1 and 1440);--> statement-breakpoint
ALTER TABLE "time_entry" ADD CONSTRAINT "time_entry_description_valid" CHECK (("time_entry"."description" is null or ("time_entry"."description" = btrim("time_entry"."description") and length("time_entry"."description") between 1 and 500)));