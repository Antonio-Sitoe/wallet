import type { FastifyRequest } from "fastify";

import { parse } from "../../shared/utils/validate";
import {
	breakdownQuery,
	categoriesQuery,
	periodQuery,
	trendQuery,
} from "./analytics.schema";
import type { AnalyticsService } from "./analytics.service";

export class AnalyticsController {
	constructor(private readonly service: AnalyticsService) {}

	overview = async (req: FastifyRequest) => {
		const { from, to } = parse(periodQuery, req.query);
		return this.service.overview(req.userId, from, to);
	};

	cashflow = async (req: FastifyRequest) => {
		const { from, to, bucket } = parse(trendQuery, req.query);
		parse(periodQuery, { from, to });
		return this.service.cashflow(req.userId, from, to, bucket);
	};

	balance = async (req: FastifyRequest) => {
		const { from, to, bucket } = parse(trendQuery, req.query);
		parse(periodQuery, { from, to });
		return this.service.balance(req.userId, from, to, bucket);
	};

	categories = async (req: FastifyRequest) => {
		const { from, to, limit } = parse(categoriesQuery, req.query);
		parse(periodQuery, { from, to });
		return this.service.categories(req.userId, from, to, limit);
	};

	breakdown = async (req: FastifyRequest) => {
		const query = parse(breakdownQuery, req.query);
		parse(periodQuery, { from: query.from, to: query.to });
		return this.service.breakdown(req.userId, query);
	};

	comparison = async (req: FastifyRequest) => {
		const { from, to } = parse(periodQuery, req.query);
		return this.service.comparison(req.userId, from, to);
	};
}
