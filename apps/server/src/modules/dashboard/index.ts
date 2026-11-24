import type { Database } from "@wallet/db";

import { DashboardController } from "./dashboard.controller";
import { DashboardRepository } from "./dashboard.repository";
import { dashboardRoutes } from "./dashboard.routes";
import { DashboardService } from "./dashboard.service";

export { DashboardService } from "./dashboard.service";

export function createDashboardModule(db: Database) {
	const repository = new DashboardRepository(db);
	const service = new DashboardService(repository);
	const controller = new DashboardController(service);
	return { service, routes: dashboardRoutes(controller) };
}
