CREATE TYPE "account_type" AS ENUM('bank', 'mobile_wallet', 'cash', 'savings');--> statement-breakpoint
CREATE TYPE "budget_frequency" AS ENUM('monthly', 'months', 'once');--> statement-breakpoint
CREATE TYPE "budget_group" AS ENUM('fixed', 'savings', 'variable', 'oneoff');--> statement-breakpoint
CREATE TYPE "category_kind" AS ENUM('expense', 'income', 'system');--> statement-breakpoint
CREATE TYPE "card_size" AS ENUM('half', 'full');--> statement-breakpoint
CREATE TYPE "import_status" AS ENUM('draft', 'committed', 'reverted');--> statement-breakpoint
CREATE TYPE "transaction_type" AS ENUM('expense', 'income', 'transfer', 'adjustment');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" "account_type" NOT NULL,
	"initial_balance" bigint DEFAULT 0 NOT NULL,
	"color" text,
	"archived" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"year" integer NOT NULL,
	"expected_income" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "month_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"plan_id" uuid,
	"plan_item_id" uuid,
	"month" varchar(7) NOT NULL,
	"name" text NOT NULL,
	"group" "budget_group" DEFAULT 'fixed'::"budget_group" NOT NULL,
	"category_id" uuid,
	"account_id" uuid,
	"to_account_id" uuid,
	"planned_amount" bigint NOT NULL,
	"partial" boolean DEFAULT false NOT NULL,
	"step" bigint,
	"unplanned" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"plan_id" uuid NOT NULL,
	"name" text NOT NULL,
	"group" "budget_group" DEFAULT 'fixed'::"budget_group" NOT NULL,
	"category_id" uuid,
	"amount" bigint NOT NULL,
	"frequency" "budget_frequency" DEFAULT 'monthly'::"budget_frequency" NOT NULL,
	"months" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"account_id" uuid,
	"to_account_id" uuid,
	"partial" boolean DEFAULT false NOT NULL,
	"step" bigint,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"slug" text,
	"name" text NOT NULL,
	"kind" "category_kind" NOT NULL,
	"parent_id" uuid,
	"color" text,
	"icon" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_category_map" (
	"user_id" text,
	"wallet_name" text,
	"category_id" uuid,
	CONSTRAINT "wallet_category_map_pkey" PRIMARY KEY("user_id","wallet_name")
);
--> statement-breakpoint
CREATE TABLE "dashboard_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"size" "card_size" DEFAULT 'half'::"card_size" NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"source" text NOT NULL,
	"status" "import_status" DEFAULT 'draft'::"import_status" NOT NULL,
	"summary" jsonb NOT NULL,
	"plan" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"committed_at" timestamp with time zone,
	"reverted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"category_id" uuid,
	"type" "transaction_type" NOT NULL,
	"amount" bigint NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"reference_month" varchar(7) NOT NULL,
	"note" text,
	"payee" text,
	"labels" text[] DEFAULT '{}'::text[] NOT NULL,
	"payment_type" text,
	"currency" varchar(3) DEFAULT 'MZN' NOT NULL,
	"ref_amount" bigint,
	"transfer_id" uuid,
	"month_item_id" uuid,
	"import_hash" text,
	"import_batch_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_amount_nonzero" CHECK ("amount" <> 0),
	CONSTRAINT "transactions_reference_month_format" CHECK ("reference_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "transactions_sign_matches_type" CHECK (("type" = 'expense' and "amount" < 0) or ("type" = 'income' and "amount" > 0) or "type" in ('transfer', 'adjustment')),
	CONSTRAINT "transactions_transfer_link" CHECK (("type" = 'transfer') = ("transfer_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"from_account_id" uuid NOT NULL,
	"to_account_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"import_batch_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transfers_amount_positive" CHECK ("amount" > 0),
	CONSTRAINT "transfers_distinct_accounts" CHECK ("from_account_id" <> "to_account_id")
);
--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "accounts" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_user_name_uq" ON "accounts" ("user_id",lower("name"));--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "budget_plans_user_year_uq" ON "budget_plans" ("user_id","year");--> statement-breakpoint
CREATE INDEX "month_items_user_month_idx" ON "month_items" ("user_id","month");--> statement-breakpoint
CREATE UNIQUE INDEX "month_items_plan_item_month_uq" ON "month_items" ("plan_item_id","month") WHERE "plan_item_id" is not null;--> statement-breakpoint
CREATE INDEX "plan_items_plan_idx" ON "plan_items" ("plan_id");--> statement-breakpoint
CREATE INDEX "categories_user_idx" ON "categories" ("user_id");--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_slug_uq" ON "categories" ("user_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_parent_name_uq" ON "categories" ("user_id",coalesce("parent_id", '00000000-0000-0000-0000-000000000000'::uuid),lower("name"));--> statement-breakpoint
CREATE INDEX "dashboard_cards_user_idx" ON "dashboard_cards" ("user_id","position");--> statement-breakpoint
CREATE INDEX "import_batches_user_idx" ON "import_batches" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "transactions_user_date_idx" ON "transactions" ("user_id","occurred_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "transactions_account_idx" ON "transactions" ("account_id");--> statement-breakpoint
CREATE INDEX "transactions_category_idx" ON "transactions" ("category_id");--> statement-breakpoint
CREATE INDEX "transactions_transfer_idx" ON "transactions" ("transfer_id");--> statement-breakpoint
CREATE INDEX "transactions_batch_idx" ON "transactions" ("import_batch_id");--> statement-breakpoint
CREATE INDEX "transactions_month_item_idx" ON "transactions" ("month_item_id");--> statement-breakpoint
CREATE INDEX "transactions_user_month_idx" ON "transactions" ("user_id","reference_month");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_user_import_hash_uq" ON "transactions" ("user_id","import_hash") WHERE "import_hash" is not null;--> statement-breakpoint
CREATE INDEX "transfers_user_idx" ON "transfers" ("user_id");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "budget_plans" ADD CONSTRAINT "budget_plans_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "month_items" ADD CONSTRAINT "month_items_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "month_items" ADD CONSTRAINT "month_items_plan_id_budget_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "budget_plans"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "month_items" ADD CONSTRAINT "month_items_plan_item_id_plan_items_id_fkey" FOREIGN KEY ("plan_item_id") REFERENCES "plan_items"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "month_items" ADD CONSTRAINT "month_items_category_id_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "month_items" ADD CONSTRAINT "month_items_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "month_items" ADD CONSTRAINT "month_items_to_account_id_accounts_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_plan_id_budget_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "budget_plans"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_category_id_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_to_account_id_accounts_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "wallet_category_map" ADD CONSTRAINT "wallet_category_map_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "wallet_category_map" ADD CONSTRAINT "wallet_category_map_category_id_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "dashboard_cards" ADD CONSTRAINT "dashboard_cards_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transfer_id_transfers_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "transfers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_month_item_id_month_items_id_fkey" FOREIGN KEY ("month_item_id") REFERENCES "month_items"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_import_batch_id_import_batches_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_from_account_id_accounts_id_fkey" FOREIGN KEY ("from_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_to_account_id_accounts_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_import_batch_id_import_batches_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE SET NULL;