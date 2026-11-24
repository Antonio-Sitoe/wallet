import type { FastifyReply, FastifyRequest } from "fastify";

import { parse } from "../../shared/utils/validate";
import {
	createCardInput,
	idParams,
	reorderCardsInput,
	updateCardInput,
} from "./dashboard.schema";
import type { DashboardService } from "./dashboard.service";

export class DashboardController {
	constructor(private readonly service: DashboardService) {}

	list = async (req: FastifyRequest) => this.service.list(req.userId);

	add = async (req: FastifyRequest, reply: FastifyReply) => {
		const card = await this.service.add(
			req.userId,
			parse(createCardInput, req.body),
		);
		return reply.status(201).send(card);
	};

	update = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.service.update(
			req.userId,
			id,
			parse(updateCardInput, req.body),
		);
	};

	remove = async (req: FastifyRequest, reply: FastifyReply) => {
		const { id } = parse(idParams, req.params);
		await this.service.remove(req.userId, id);
		return reply.status(204).send();
	};

	reorder = async (req: FastifyRequest) => {
		const { ids } = parse(reorderCardsInput, req.body);
		return this.service.reorder(req.userId, ids);
	};

	reset = async (req: FastifyRequest) => this.service.reset(req.userId);
}
