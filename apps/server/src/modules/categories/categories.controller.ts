import type { FastifyReply, FastifyRequest } from "fastify";

import { parse } from "../../shared/utils/validate";
import {
	createCategoryInput,
	idParams,
	setWalletMappingInput,
	updateCategoryInput,
} from "./categories.schema";
import type { CategoriesService } from "./categories.service";

export class CategoriesController {
	constructor(private readonly service: CategoriesService) {}

	list = async (req: FastifyRequest) => this.service.list(req.userId);

	create = async (req: FastifyRequest, reply: FastifyReply) => {
		const category = await this.service.create(
			req.userId,
			parse(createCategoryInput, req.body),
		);
		return reply.status(201).send(category);
	};

	update = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.service.update(
			req.userId,
			id,
			parse(updateCategoryInput, req.body),
		);
	};

	remove = async (req: FastifyRequest, reply: FastifyReply) => {
		const { id } = parse(idParams, req.params);
		await this.service.remove(req.userId, id);
		return reply.status(204).send();
	};

	getWalletMap = async (req: FastifyRequest) =>
		this.service.getWalletMap(req.userId);

	setWalletMapping = async (req: FastifyRequest) => {
		await this.service.setWalletMappings(req.userId, [
			parse(setWalletMappingInput, req.body),
		]);
		return this.service.getWalletMap(req.userId);
	};
}
