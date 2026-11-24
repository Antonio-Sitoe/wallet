import type { FastifyPluginAsync } from "fastify";

import type { AnalyticsController } from "./analytics.controller";

export function analyticsRoutes(
	controller: AnalyticsController,
): FastifyPluginAsync {
	return async (app) => {
		app.get("/analytics/overview", controller.overview);
		app.get("/analytics/cashflow", controller.cashflow);
		app.get("/analytics/balance", controller.balance);
		app.get("/analytics/categories", controller.categories);
		app.get("/analytics/comparison", controller.comparison);
		app.get("/analytics/breakdown", controller.breakdown);
	};
}
