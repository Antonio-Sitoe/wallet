CREATE TYPE "debt_direction" AS ENUM('owed_to_me', 'i_owe');--> statement-breakpoint
CREATE TABLE "debt_ignored_people" (
	"user_id" text,
	"person_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "debt_ignored_people_pkey" PRIMARY KEY("user_id","person_key")
);
--> statement-breakpoint
CREATE TABLE "debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"person" text NOT NULL,
	"direction" "debt_direction" NOT NULL,
	"amount" bigint NOT NULL,
	"note" text,
	"remind_on" varchar(10),
	"archived" boolean DEFAULT false NOT NULL,
	"import_batch_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "debts_amount_positive" CHECK ("amount" > 0),
	CONSTRAINT "debts_remind_on_format" CHECK ("remind_on" is null or "remind_on" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "debt_id" uuid;--> statement-breakpoint
CREATE INDEX "debts_user_idx" ON "debts" ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_debt_idx" ON "transactions" ("debt_id");--> statement-breakpoint
ALTER TABLE "debt_ignored_people" ADD CONSTRAINT "debt_ignored_people_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_import_batch_id_import_batches_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_debt_id_debts_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE SET NULL;