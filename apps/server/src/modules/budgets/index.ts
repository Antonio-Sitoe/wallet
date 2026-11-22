import type { Database } from "@wallet/db";

import { budgetsRoutes } from "./routes";
import { type BudgetsDeps, createBudgetsService } from "./service";

export type { BudgetsDeps, BudgetsService } from "./service";

/** Yearly plan + monthly lists: check = transaction. Owns `budget_plans`, `plan_items`, `month_items`. */
export function createBudgetsModule(db: Database, deps: BudgetsDeps) {
	const service = createBudgetsService(db, deps);
	return { service, routes: budgetsRoutes(service) };
}
