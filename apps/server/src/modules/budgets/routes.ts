import {
	createMonthItemInput,
	createPlanInput,
	createPlanItemInput,
	deletePlanItemQuery,
	idParams,
	monthParams,
	payMonthItemInput,
	paymentParams,
	planViewQuery,
	updateMonthItemInput,
	updatePlanInput,
	updatePlanItemInput,
	yearParams,
} from "@wallet/shared";
import type { FastifyPluginAsync } from "fastify";

import { parse } from "../../lib/validate";
import type { BudgetsService } from "./service";

export function budgetsRoutes(service: BudgetsService): FastifyPluginAsync {
	return async (app) => {
		// Yearly plan
		app.get("/budgets/plans", async (req) => service.listPlans(req.userId));

		app.post("/budgets/plans", async (req, reply) => {
			const plan = await service.createPlan(
				req.userId,
				parse(createPlanInput, req.body),
			);
			return reply.status(201).send(plan);
		});

		app.get("/budgets/plans/:year", async (req) => {
			const { year } = parse(yearParams, req.params);
			const { asOf } = parse(planViewQuery, req.query);
			return service.getPlan(req.userId, year, asOf);
		});

		app.patch("/budgets/plans/:year", async (req) => {
			const { year } = parse(yearParams, req.params);
			return service.updatePlan(
				req.userId,
				year,
				parse(updatePlanInput, req.body),
			);
		});

		app.delete("/budgets/plans/:year", async (req, reply) => {
			const { year } = parse(yearParams, req.params);
			await service.deletePlan(req.userId, year);
			return reply.status(204).send();
		});

		app.post("/budgets/plans/:year/generate", async (req) => {
			const { year } = parse(yearParams, req.params);
			return service.generate(req.userId, year);
		});

		app.post("/budgets/plans/:year/items", async (req, reply) => {
			const { year } = parse(yearParams, req.params);
			const item = await service.addPlanItem(
				req.userId,
				year,
				parse(createPlanItemInput, req.body),
			);
			return reply.status(201).send(item);
		});

		app.patch("/budgets/plan-items/:id", async (req) => {
			const { id } = parse(idParams, req.params);
			return service.updatePlanItem(
				req.userId,
				id,
				parse(updatePlanItemInput, req.body),
			);
		});

		app.delete("/budgets/plan-items/:id", async (req, reply) => {
			const { id } = parse(idParams, req.params);
			const { applyFrom } = parse(deletePlanItemQuery, req.query);
			await service.deletePlanItem(req.userId, id, applyFrom);
			return reply.status(204).send();
		});

		// Month lists
		app.get("/budgets/months/:month", async (req) => {
			const { month } = parse(monthParams, req.params);
			return service.getMonth(req.userId, month);
		});

		app.post("/budgets/months/:month/items", async (req, reply) => {
			const { month } = parse(monthParams, req.params);
			const item = await service.addMonthItem(
				req.userId,
				month,
				parse(createMonthItemInput, req.body),
			);
			return reply.status(201).send(item);
		});

		app.get("/budgets/month-items/:id", async (req) => {
			const { id } = parse(idParams, req.params);
			return service.getMonthItem(req.userId, id);
		});

		app.patch("/budgets/month-items/:id", async (req) => {
			const { id } = parse(idParams, req.params);
			return service.updateMonthItem(
				req.userId,
				id,
				parse(updateMonthItemInput, req.body),
			);
		});

		app.delete("/budgets/month-items/:id", async (req, reply) => {
			const { id } = parse(idParams, req.params);
			await service.deleteMonthItem(req.userId, id);
			return reply.status(204).send();
		});

		/** Check / launch: records a payment of the item. */
		app.post("/budgets/month-items/:id/payments", async (req, reply) => {
			const { id } = parse(idParams, req.params);
			const item = await service.pay(
				req.userId,
				id,
				parse(payMonthItemInput, req.body ?? {}),
			);
			return reply.status(201).send(item);
		});

		/** Uncheck: removes every payment of the item. */
		app.delete("/budgets/month-items/:id/payments", async (req) => {
			const { id } = parse(idParams, req.params);
			return service.unpay(req.userId, id);
		});

		app.delete(
			"/budgets/month-items/:id/payments/:transactionId",
			async (req) => {
				const { id, transactionId } = parse(paymentParams, req.params);
				return service.removePayment(req.userId, id, transactionId);
			},
		);
	};
}
