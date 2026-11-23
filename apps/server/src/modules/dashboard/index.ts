import type { Database } from "@wallet/db";

import { dashboardRoutes } from "./routes";
import { createDashboardService } from "./service";

export type { DashboardService } from "./service";

/** The user's dashboard layout: which cards, in what order and size. Owns `dashboard_cards`. */
export function createDashboardModule(db: Database) {
	const service = createDashboardService(db);
	return { service, routes: dashboardRoutes(service) };
}
