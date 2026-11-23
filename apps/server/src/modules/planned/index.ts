import type { Database } from "@wallet/db";

import { PlannedController } from "./planned.controller";
import { PlannedRepository } from "./planned.repository";
import { plannedRoutes } from "./planned.routes";
import { PlannedService } from "./planned.service";
import type { PlannedDeps } from "./planned.types";

export { PlannedService } from "./planned.service";

export function createPlannedModule(db: Database, deps: PlannedDeps) {
	const repository = new PlannedRepository(db);
	const service = new PlannedService(repository, deps);
	const controller = new PlannedController(service);
	return { service, routes: plannedRoutes(controller) };
}
