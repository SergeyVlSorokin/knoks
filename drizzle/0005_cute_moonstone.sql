ALTER TABLE "time_entry_audit" ADD COLUMN "before_account_display_name" text;--> statement-breakpoint
ALTER TABLE "time_entry_audit" ADD COLUMN "before_client_display_name" text;--> statement-breakpoint
ALTER TABLE "time_entry_audit" ADD COLUMN "after_account_display_name" text;--> statement-breakpoint
ALTER TABLE "time_entry_audit" ADD COLUMN "after_client_display_name" text;
--> statement-breakpoint
UPDATE "time_entry_audit" AS audit
SET "before_account_display_name" = account."display_name"
FROM "account" AS account
WHERE audit."before_account_id" = account."id" AND audit."before_account_display_name" IS NULL;--> statement-breakpoint
UPDATE "time_entry_audit" AS audit
SET "before_client_display_name" = client."display_name"
FROM "client" AS client
WHERE audit."before_client_id" = client."id" AND audit."before_client_display_name" IS NULL;--> statement-breakpoint
UPDATE "time_entry_audit" AS audit
SET "after_account_display_name" = account."display_name"
FROM "account" AS account
WHERE audit."after_account_id" = account."id" AND audit."after_account_display_name" IS NULL;--> statement-breakpoint
UPDATE "time_entry_audit" AS audit
SET "after_client_display_name" = client."display_name"
FROM "client" AS client
WHERE audit."after_client_id" = client."id" AND audit."after_client_display_name" IS NULL;