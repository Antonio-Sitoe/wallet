import { categoriesQuery, periodQuery, trendQuery } from "@wallet/shared";
import type { FastifyPluginAsync } from "fastify";

import { parse } from "../../lib/validate";
import type { AnalyticsService } from "./service";

/** All periods are days in Mozambique time, both ends inclusive: ?from=2026-11-01&to=2026-11-30. */
export function analyticsRoutes(service: AnalyticsService): FastifyPluginAsync {
	return async (app) => {
		app.get("/analytics/overview", async (req) => {
			const { from, to } = parse(periodQuery, req.query);
			return service.overview(req.userId, from, to);
		});

		app.get("/analytics/cashflow", async (req) => {
			const { from, to, bucket } = parse(trendQuery, req.query);
			parse(periodQuery, { from, to });
			return service.cashflow(req.userId, from, to, bucket);
		});

		app.get("/analytics/balance", async (req) => {
			const { from, to, bucket } = parse(trendQuery, req.query);
			parse(periodQuery, { from, to });
			return service.balance(req.userId, from, to, bucket);
		});

		app.get("/analytics/categories", async (req) => {
			const { from, to, limit } = parse(categoriesQuery, req.query);
			parse(periodQuery, { from, to });
			return service.categories(req.userId, from, to, limit);
		});

		app.get("/analytics/comparison", async (req) => {
			const { from, to } = parse(periodQuery, req.query);
			return service.comparison(req.userId, from, to);
		});
	};
}
