CREATE TYPE "planned_event_status" AS ENUM('paid', 'skipped');--> statement-breakpoint
CREATE TYPE "planned_frequency" AS ENUM('once', 'monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "planned_kind" AS ENUM('expense', 'transfer');--> statement-breakpoint
CREATE TABLE "planned_payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"payment_id" uuid NOT NULL,
	"due_date" varchar(10) NOT NULL,
	"status" "planned_event_status" NOT NULL,
	"transaction_id" uuid,
	"transfer_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planned_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" "planned_kind" NOT NULL,
	"amount" bigint NOT NULL,
	"account_id" uuid,
	"to_account_id" uuid,
	"category_id" uuid,
	"frequency" "planned_frequency" NOT NULL,
	"start_date" varchar(10) NOT NULL,
	"end_date" varchar(10),
	"remind_days" integer,
	"plan_item_id" uuid,
	"note" text,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "planned_payments_amount_positive" CHECK ("amount" > 0),
	CONSTRAINT "planned_payments_dates_format" CHECK ("start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' and ("end_date" is null or "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "planned_payment_events_due_uq" ON "planned_payment_events" ("payment_id","due_date");--> statement-breakpoint
CREATE INDEX "planned_payment_events_user_idx" ON "planned_payment_events" ("user_id");--> statement-breakpoint
CREATE INDEX "planned_payments_user_idx" ON "planned_payments" ("user_id");--> statement-breakpoint
ALTER TABLE "planned_payment_events" ADD CONSTRAINT "planned_payment_events_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "planned_payment_events" ADD CONSTRAINT "planned_payment_events_payment_id_planned_payments_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "planned_payments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "planned_payment_events" ADD CONSTRAINT "planned_payment_events_transaction_id_transactions_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "planned_payment_events" ADD CONSTRAINT "planned_payment_events_transfer_id_transfers_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "transfers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "planned_payments" ADD CONSTRAINT "planned_payments_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "planned_payments" ADD CONSTRAINT "planned_payments_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "planned_payments" ADD CONSTRAINT "planned_payments_to_account_id_accounts_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "planned_payments" ADD CONSTRAINT "planned_payments_category_id_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "planned_payments" ADD CONSTRAINT "planned_payments_plan_item_id_plan_items_id_fkey" FOREIGN KEY ("plan_item_id") REFERENCES "plan_items"("id") ON DELETE SET NULL;