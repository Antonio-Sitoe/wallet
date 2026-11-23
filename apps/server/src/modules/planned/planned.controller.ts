import type { FastifyReply, FastifyRequest } from "fastify";

import { parse } from "../../shared/utils/validate";
import {
	confirmPlannedPaymentInput,
	createPlannedPaymentInput,
	idParams,
	listPlannedPaymentsQuery,
	plannedOccurrenceParams,
	plannedOccurrencesQuery,
	plannedRemindersQuery,
	skipPlannedPaymentInput,
	updatePlannedPaymentInput,
} from "./planned.schema";
import type { PlannedService } from "./planned.service";

export class PlannedController {
	constructor(private readonly service: PlannedService) {}

	list = async (req: FastifyRequest) =>
		this.service.list(req.userId, parse(listPlannedPaymentsQuery, req.query));

	occurrences = async (req: FastifyRequest) =>
		this.service.occurrences(
			req.userId,
			parse(plannedOccurrencesQuery, req.query),
		);

	reminders = async (req: FastifyRequest) =>
		this.service.reminders(
			req.userId,
			parse(plannedRemindersQuery, req.query).today,
		);

	get = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.service.get(req.userId, id);
	};

	create = async (req: FastifyRequest, reply: FastifyReply) => {
		const payment = await this.service.create(
			req.userId,
			parse(createPlannedPaymentInput, req.body),
		);
		return reply.status(201).send(payment);
	};

	update = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.service.update(
			req.userId,
			id,
			parse(updatePlannedPaymentInput, req.body),
		);
	};

	remove = async (req: FastifyRequest, reply: FastifyReply) => {
		const { id } = parse(idParams, req.params);
		await this.service.remove(req.userId, id);
		return reply.status(204).send();
	};

	confirm = async (req: FastifyRequest, reply: FastifyReply) => {
		const { id } = parse(idParams, req.params);
		const occurrence = await this.service.confirm(
			req.userId,
			id,
			parse(confirmPlannedPaymentInput, req.body),
		);
		return reply.status(201).send(occurrence);
	};

	skip = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		const { dueDate } = parse(skipPlannedPaymentInput, req.body);
		return this.service.skip(req.userId, id, dueDate);
	};

	undo = async (req: FastifyRequest) => {
		const { id, dueDate } = parse(plannedOccurrenceParams, req.params);
		return this.service.undo(req.userId, id, dueDate);
	};
}
