import { AnalyticsController } from "./analytics.controller";
import { analyticsRoutes } from "./analytics.routes";
import { AnalyticsService } from "./analytics.service";
import type { AnalyticsDeps } from "./analytics.types";

export { AnalyticsService } from "./analytics.service";
export type { AnalyticsDeps } from "./analytics.types";

export function createAnalyticsModule(deps: AnalyticsDeps) {
	const service = new AnalyticsService(deps);
	const controller = new AnalyticsController(service);
	return { service, routes: analyticsRoutes(controller) };
}
