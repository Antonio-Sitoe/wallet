import type { FastifyReply, FastifyRequest } from "fastify";

import { parse } from "../../shared/utils/validate";
import {
	createTransactionInput,
	createTransferInput,
	idParams,
	listTransactionsQuery,
	updateTransactionInput,
	updateTransferInput,
} from "./transactions.schema";
import type { TransactionsService } from "./transactions.service";

export class TransactionsController {
	constructor(private readonly service: TransactionsService) {}

	labels = async (req: FastifyRequest) => this.service.labels(req.userId);

	list = async (req: FastifyRequest) =>
		this.service.list(req.userId, parse(listTransactionsQuery, req.query));

	create = async (req: FastifyRequest, reply: FastifyReply) => {
		const transaction = await this.service.create(
			req.userId,
			parse(createTransactionInput, req.body),
		);
		return reply.status(201).send(transaction);
	};

	get = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.service.get(req.userId, id);
	};

	update = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.service.update(
			req.userId,
			id,
			parse(updateTransactionInput, req.body),
		);
	};

	remove = async (req: FastifyRequest, reply: FastifyReply) => {
		const { id } = parse(idParams, req.params);
		await this.service.remove(req.userId, id);
		return reply.status(204).send();
	};

	createTransfer = async (req: FastifyRequest, reply: FastifyReply) => {
		const transfer = await this.service.createTransfer(
			req.userId,
			parse(createTransferInput, req.body),
		);
		return reply.status(201).send(transfer);
	};

	getTransfer = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.service.getTransfer(req.userId, id);
	};

	updateTransfer = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.service.updateTransfer(
			req.userId,
			id,
			parse(updateTransferInput, req.body),
		);
	};

	removeTransfer = async (req: FastifyRequest, reply: FastifyReply) => {
		const { id } = parse(idParams, req.params);
		await this.service.removeTransfer(req.userId, id);
		return reply.status(204).send();
	};
}
