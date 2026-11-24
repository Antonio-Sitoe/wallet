CREATE TYPE "planned_event_source" AS ENUM('manual', 'auto');--> statement-breakpoint
ALTER TABLE "planned_payment_events" ADD COLUMN "source" "planned_event_source" DEFAULT 'manual'::"planned_event_source" NOT NULL;--> statement-breakpoint
ALTER TABLE "planned_payments" ADD COLUMN "auto_confirm_from" varchar(10);--> statement-breakpoint
CREATE INDEX "planned_payments_auto_idx" ON "planned_payments" ("auto_confirm_from") WHERE "auto_confirm_from" is not null;