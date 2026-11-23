import type { FastifyReply, FastifyRequest } from "fastify";

import { parse } from "../../shared/utils/validate";
import {
	addShoppingItemInput,
	buyShoppingItemInput,
	createShoppingListInput,
	idParams,
	listShoppingListsQuery,
	shoppingItemParams,
	updateShoppingItemInput,
	updateShoppingListInput,
} from "./shopping.schema";
import type { ShoppingService } from "./shopping.service";

export class ShoppingController {
	constructor(private readonly service: ShoppingService) {}

	list = async (req: FastifyRequest) =>
		this.service.list(req.userId, parse(listShoppingListsQuery, req.query));

	get = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.service.get(req.userId, id);
	};

	create = async (req: FastifyRequest, reply: FastifyReply) => {
		const list = await this.service.create(
			req.userId,
			parse(createShoppingListInput, req.body),
		);
		return reply.status(201).send(list);
	};

	update = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.service.update(
			req.userId,
			id,
			parse(updateShoppingListInput, req.body),
		);
	};

	remove = async (req: FastifyRequest, reply: FastifyReply) => {
		const { id } = parse(idParams, req.params);
		await this.service.remove(req.userId, id);
		return reply.status(204).send();
	};

	addItem = async (req: FastifyRequest, reply: FastifyReply) => {
		const { id } = parse(idParams, req.params);
		const list = await this.service.addItem(
			req.userId,
			id,
			parse(addShoppingItemInput, req.body),
		);
		return reply.status(201).send(list);
	};

	updateItem = async (req: FastifyRequest) => {
		const { id, itemId } = parse(shoppingItemParams, req.params);
		return this.service.updateItem(
			req.userId,
			id,
			itemId,
			parse(updateShoppingItemInput, req.body),
		);
	};

	removeItem = async (req: FastifyRequest) => {
		const { id, itemId } = parse(shoppingItemParams, req.params);
		return this.service.removeItem(req.userId, id, itemId);
	};

	buy = async (req: FastifyRequest, reply: FastifyReply) => {
		const { id, itemId } = parse(shoppingItemParams, req.params);
		const list = await this.service.buy(
			req.userId,
			id,
			itemId,
			parse(buyShoppingItemInput, req.body),
		);
		return reply.status(201).send(list);
	};

	unbuy = async (req: FastifyRequest) => {
		const { id, itemId } = parse(shoppingItemParams, req.params);
		return this.service.unbuy(req.userId, id, itemId);
	};
}
