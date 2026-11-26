CREATE TABLE "whatsapp_inbox" (
	"message_id" text PRIMARY KEY,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL UNIQUE,
	"phone" text NOT NULL,
	"verified_at" timestamp with time zone,
	"code_hash" text,
	"code_expires_at" timestamp with time zone,
	"code_attempts" integer DEFAULT 0 NOT NULL,
	"codes_sent_at" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_unknown_replies" (
	"phone" text PRIMARY KEY,
	"replied_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_links_verified_phone_uq" ON "whatsapp_links" ("phone") WHERE "verified_at" is not null;--> statement-breakpoint
ALTER TABLE "whatsapp_links" ADD CONSTRAINT "whatsapp_links_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;