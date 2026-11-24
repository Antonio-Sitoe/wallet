CREATE TABLE "goal_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"goal_id" uuid NOT NULL,
	"name" text NOT NULL,
	"amount" bigint NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goal_parts_amount_positive" CHECK ("amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" varchar(7),
	"target" bigint NOT NULL,
	"starting_amount" bigint DEFAULT 0 NOT NULL,
	"account_id" uuid NOT NULL,
	"deadline" varchar(7),
	"plan_item_id" uuid,
	"archived" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"import_batch_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goals_target_positive" CHECK ("target" > 0),
	CONSTRAINT "goals_starting_amount_nonnegative" CHECK ("starting_amount" >= 0),
	CONSTRAINT "goals_deadline_format" CHECK ("deadline" is null or "deadline" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);
--> statement-breakpoint
ALTER TABLE "transfers" ADD COLUMN "goal_id" uuid;--> statement-breakpoint
CREATE INDEX "goal_parts_goal_idx" ON "goal_parts" ("goal_id");--> statement-breakpoint
CREATE INDEX "goals_user_idx" ON "goals" ("user_id");--> statement-breakpoint
CREATE INDEX "transfers_goal_idx" ON "transfers" ("goal_id");--> statement-breakpoint
ALTER TABLE "goal_parts" ADD CONSTRAINT "goal_parts_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "goal_parts" ADD CONSTRAINT "goal_parts_goal_id_goals_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_plan_item_id_plan_items_id_fkey" FOREIGN KEY ("plan_item_id") REFERENCES "plan_items"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_import_batch_id_import_batches_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_goal_id_goals_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE SET NULL;