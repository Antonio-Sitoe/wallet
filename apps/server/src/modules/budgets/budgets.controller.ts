import type { FastifyReply, FastifyRequest } from "fastify";

import { parse } from "../../shared/utils/validate";
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
} from "./budgets.schema";
import type { BudgetsService } from "./budgets.service";

export class BudgetsController {
	constructor(private readonly service: BudgetsService) {}

	listPlans = async (req: FastifyRequest) => this.service.listPlans(req.userId);

	createPlan = async (req: FastifyRequest, reply: FastifyReply) => {
		const plan = await this.service.createPlan(
			req.userId,
			parse(createPlanInput, req.body),
		);
		return reply.status(201).send(plan);
	};

	getPlan = async (req: FastifyRequest) => {
		const { year } = parse(yearParams, req.params);
		const { asOf } = parse(planViewQuery, req.query);
		return this.service.getPlan(req.userId, year, asOf);
	};

	updatePlan = async (req: FastifyRequest) => {
		const { year } = parse(yearParams, req.params);
		return this.service.updatePlan(
			req.userId,
			year,
			parse(updatePlanInput, req.body),
		);
	};

	deletePlan = async (req: FastifyRequest, reply: FastifyReply) => {
		const { year } = parse(yearParams, req.params);
		await this.service.deletePlan(req.userId, year);
		return reply.status(204).send();
	};

	generate = async (req: FastifyRequest) => {
		const { year } = parse(yearParams, req.params);
		return this.service.generate(req.userId, year);
	};

	addPlanItem = async (req: FastifyRequest, reply: FastifyReply) => {
		const { year } = parse(yearParams, req.params);
		const item = await this.service.addPlanItem(
			req.userId,
			year,
			parse(createPlanItemInput, req.body),
		);
		return reply.status(201).send(item);
	};

	updatePlanItem = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.service.updatePlanItem(
			req.userId,
			id,
			parse(updatePlanItemInput, req.body),
		);
	};

	deletePlanItem = async (req: FastifyRequest, reply: FastifyReply) => {
		const { id } = parse(idParams, req.params);
		const { applyFrom } = parse(deletePlanItemQuery, req.query);
		await this.service.deletePlanItem(req.userId, id, applyFrom);
		return reply.status(204).send();
	};

	getMonth = async (req: FastifyRequest) => {
		const { month } = parse(monthParams, req.params);
		return this.service.getMonth(req.userId, month);
	};

	addMonthItem = async (req: FastifyRequest, reply: FastifyReply) => {
		const { month } = parse(monthParams, req.params);
		const item = await this.service.addMonthItem(
			req.userId,
			month,
			parse(createMonthItemInput, req.body),
		);
		return reply.status(201).send(item);
	};

	getMonthItem = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.service.getMonthItem(req.userId, id);
	};

	updateMonthItem = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.service.updateMonthItem(
			req.userId,
			id,
			parse(updateMonthItemInput, req.body),
		);
	};

	deleteMonthItem = async (req: FastifyRequest, reply: FastifyReply) => {
		const { id } = parse(idParams, req.params);
		await this.service.deleteMonthItem(req.userId, id);
		return reply.status(204).send();
	};

	pay = async (req: FastifyRequest, reply: FastifyReply) => {
		const { id } = parse(idParams, req.params);
		const item = await this.service.pay(
			req.userId,
			id,
			parse(payMonthItemInput, req.body ?? {}),
		);
		return reply.status(201).send(item);
	};

	unpay = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.service.unpay(req.userId, id);
	};

	removePayment = async (req: FastifyRequest) => {
		const { id, transactionId } = parse(paymentParams, req.params);
		return this.service.removePayment(req.userId, id, transactionId);
	};
}
