import { analyticsRoutes } from "./routes";
import { type AnalyticsDeps, createAnalyticsService } from "./service";

export type { AnalyticsDeps, AnalyticsService } from "./service";

/** Read-only figures for the dashboard: totals, trends, categories, period comparison. Owns no tables. */
export function createAnalyticsModule(deps: AnalyticsDeps) {
	const service = createAnalyticsService(deps);
	return { service, routes: analyticsRoutes(service) };
}
