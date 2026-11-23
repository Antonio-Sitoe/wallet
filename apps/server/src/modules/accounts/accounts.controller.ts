import type { FastifyReply, FastifyRequest } from "fastify";

import { parse } from "../../shared/utils/validate";
import {
	createAccountInput,
	idParams,
	listAccountsQuery,
	reconcileAccountInput,
	resetDataInput,
	updateAccountInput,
	zeroBalancesInput,
} from "./accounts.schema";
import type { AccountsService } from "./accounts.service";

export class AccountsController {
	constructor(private readonly service: AccountsService) {}

	list = async (req: FastifyRequest) => {
		return this.service.list(req.userId, parse(listAccountsQuery, req.query));
	};

	create = async (req: FastifyRequest, reply: FastifyReply) => {
		const account = await this.service.create(
			req.userId,
			parse(createAccountInput, req.body),
		);
		return reply.status(201).send(account);
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
			parse(updateAccountInput, req.body),
		);
	};

	reconcile = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		const { balance, at } = parse(reconcileAccountInput, req.body);
		return this.service.reconcile(req.userId, id, balance, at);
	};

	zeroBalances = async (req: FastifyRequest) => {
		const { at } = parse(zeroBalancesInput, req.body ?? {});
		return this.service.zeroBalances(req.userId, at);
	};

	resetData = async (req: FastifyRequest) => {
		parse(resetDataInput, req.body);
		return this.service.resetData(req.userId);
	};

	remove = async (req: FastifyRequest, reply: FastifyReply) => {
		const { id } = parse(idParams, req.params);
		await this.service.remove(req.userId, id);
		return reply.status(204).send();
	};
}
