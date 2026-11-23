import type { FastifyReply, FastifyRequest } from "fastify";

import { parse } from "../../shared/utils/validate";
import {
	contributeGoalInput,
	createGoalInput,
	createGoalPartInput,
	idParams,
	listGoalsQuery,
	updateGoalInput,
	updateGoalPartInput,
} from "./goals.schema";
import type { GoalsService } from "./goals.service";

export class GoalsController {
	constructor(private readonly service: GoalsService) {}

	list = async (req: FastifyRequest) =>
		this.service.list(req.userId, parse(listGoalsQuery, req.query));

	get = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.service.get(req.userId, id);
	};

	create = async (req: FastifyRequest, reply: FastifyReply) => {
		const goal = await this.service.create(
			req.userId,
			parse(createGoalInput, req.body),
		);
		return reply.status(201).send(goal);
	};

	update = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.service.update(
			req.userId,
			id,
			parse(updateGoalInput, req.body),
		);
	};

	remove = async (req: FastifyRequest, reply: FastifyReply) => {
		const { id } = parse(idParams, req.params);
		await this.service.remove(req.userId, id);
		return reply.status(204).send();
	};

	contribute = async (req: FastifyRequest, reply: FastifyReply) => {
		const { id } = parse(idParams, req.params);
		const goal = await this.service.contribute(
			req.userId,
			id,
			parse(contributeGoalInput, req.body),
		);
		return reply.status(201).send(goal);
	};

	addPart = async (req: FastifyRequest, reply: FastifyReply) => {
		const { id } = parse(idParams, req.params);
		const goal = await this.service.addPart(
			req.userId,
			id,
			parse(createGoalPartInput, req.body),
		);
		return reply.status(201).send(goal);
	};

	updatePart = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.service.updatePart(
			req.userId,
			id,
			parse(updateGoalPartInput, req.body),
		);
	};

	removePart = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.service.removePart(req.userId, id);
	};
}
