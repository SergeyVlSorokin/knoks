CREATE TABLE "client" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_display_name_trimmed" CHECK ("client"."display_name" = btrim("client"."display_name")),
	CONSTRAINT "client_display_name_not_blank" CHECK (length("client"."display_name") > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "client_display_name_case_insensitive" ON "client" USING btree (lower("display_name"));