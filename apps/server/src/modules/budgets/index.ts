import type { Database } from "@wallet/db";

import { BudgetsController } from "./budgets.controller";
import { BudgetsRepository } from "./budgets.repository";
import { budgetsRoutes } from "./budgets.routes";
import { BudgetsService } from "./budgets.service";
import type { BudgetsDeps } from "./budgets.types";

export { BudgetsService } from "./budgets.service";
export type { BudgetsDeps } from "./budgets.types";

export function createBudgetsModule(db: Database, deps: BudgetsDeps) {
	const repository = new BudgetsRepository(db);
	const service = new BudgetsService(repository, deps);
	const controller = new BudgetsController(service);
	return { service, routes: budgetsRoutes(controller) };
}
