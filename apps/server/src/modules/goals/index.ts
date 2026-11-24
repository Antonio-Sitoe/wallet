import type { Database } from "@wallet/db";

import { GoalsController } from "./goals.controller";
import { GoalsRepository } from "./goals.repository";
import { goalsRoutes } from "./goals.routes";
import { GoalsService } from "./goals.service";
import type { GoalsDeps } from "./goals.types";

export { GoalsService } from "./goals.service";

export function createGoalsModule(db: Database, deps: GoalsDeps) {
	const repository = new GoalsRepository(db);
	const service = new GoalsService(repository, deps);
	const controller = new GoalsController(service);
	return { service, routes: goalsRoutes(controller) };
}
