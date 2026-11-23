import type { FastifyReply, FastifyRequest } from "fastify";

import { parse } from "../../shared/utils/validate";
import {
	createDebtInput,
	debtPaymentParams,
	debtSuggestionParams,
	idParams,
	listDebtsQuery,
	payDebtInput,
	updateDebtInput,
} from "./debts.schema";
import type { DebtsService } from "./debts.service";

export class DebtsController {
	constructor(private readonly service: DebtsService) {}

	list = async (req: FastifyRequest) =>
		this.service.list(req.userId, parse(listDebtsQuery, req.query));

	get = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.service.get(req.userId, id);
	};

	create = async (req: FastifyRequest, reply: FastifyReply) => {
		const debt = await this.service.create(
			req.userId,
			parse(createDebtInput, req.body),
		);
		return reply.status(201).send(debt);
	};

	update = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.service.update(
			req.userId,
			id,
			parse(updateDebtInput, req.body),
		);
	};

	remove = async (req: FastifyRequest, reply: FastifyReply) => {
		const { id } = parse(idParams, req.params);
		await this.service.remove(req.userId, id);
		return reply.status(204).send();
	};

	pay = async (req: FastifyRequest, reply: FastifyReply) => {
		const { id } = parse(idParams, req.params);
		const debt = await this.service.pay(
			req.userId,
			id,
			parse(payDebtInput, req.body),
		);
		return reply.status(201).send(debt);
	};

	removePayment = async (req: FastifyRequest) => {
		const { id, transactionId } = parse(debtPaymentParams, req.params);
		return this.service.removePayment(req.userId, id, transactionId);
	};

	suggestions = async (req: FastifyRequest) =>
		this.service.suggestions(req.userId);

	ignoreSuggestion = async (req: FastifyRequest, reply: FastifyReply) => {
		const { key } = parse(debtSuggestionParams, req.params);
		await this.service.ignoreSuggestion(req.userId, key);
		return reply.status(204).send();
	};
}
