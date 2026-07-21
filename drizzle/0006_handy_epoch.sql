CREATE TABLE "invoice_basis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence_number" integer NOT NULL,
	"client_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_by_account_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"voided_at" timestamp with time zone,
	"voided_by_account_id" uuid,
	"void_reason" text,
	CONSTRAINT "invoice_basis_sequence_number_unique" UNIQUE("sequence_number")
);
--> statement-breakpoint
CREATE TABLE "invoice_basis_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_basis_id" uuid NOT NULL,
	"time_entry_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"account_display_name" text NOT NULL,
	"work_date" date NOT NULL,
	"duration_minutes" integer NOT NULL,
	"description" text,
	"classification" time_entry_classification NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_workspace" ADD COLUMN "next_invoice_basis_sequence" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_basis" ADD CONSTRAINT "invoice_basis_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_basis" ADD CONSTRAINT "invoice_basis_created_by_account_id_account_id_fk" FOREIGN KEY ("created_by_account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_basis" ADD CONSTRAINT "invoice_basis_voided_by_account_id_account_id_fk" FOREIGN KEY ("voided_by_account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_basis_item" ADD CONSTRAINT "invoice_basis_item_invoice_basis_id_invoice_basis_id_fk" FOREIGN KEY ("invoice_basis_id") REFERENCES "public"."invoice_basis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_basis_item" ADD CONSTRAINT "invoice_basis_item_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entry" ADD CONSTRAINT "time_entry_included_invoice_basis_id_invoice_basis_id_fk" FOREIGN KEY ("included_invoice_basis_id") REFERENCES "public"."invoice_basis"("id") ON DELETE no action ON UPDATE no action;