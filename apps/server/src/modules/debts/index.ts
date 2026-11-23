import type { Database } from "@wallet/db";

import { DebtsController } from "./debts.controller";
import { DebtsRepository } from "./debts.repository";
import { debtsRoutes } from "./debts.routes";
import { DebtsService } from "./debts.service";
import type { DebtsDeps } from "./debts.types";

export { DebtsService } from "./debts.service";

export function createDebtsModule(db: Database, deps: DebtsDeps) {
	const repository = new DebtsRepository(db);
	const service = new DebtsService(repository, deps);
	const controller = new DebtsController(service);
	return { service, routes: debtsRoutes(controller) };
}
