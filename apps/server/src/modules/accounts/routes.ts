import {
	createAccountInput,
	idParams,
	listAccountsQuery,
	reconcileAccountInput,
	updateAccountInput,
} from "@wallet/shared";
import type { FastifyPluginAsync } from "fastify";

import { parse } from "../../lib/validate";
import type { AccountsService } from "./service";

export function accountsRoutes(service: AccountsService): FastifyPluginAsync {
	return async (app) => {
		app.get("/accounts", async (req) => {
			const query = parse(listAccountsQuery, req.query);
			return service.list(req.userId, query);
		});

		app.post("/accounts", async (req, reply) => {
			const account = await service.create(
				req.userId,
				parse(createAccountInput, req.body),
			);
			return reply.status(201).send(account);
		});

		app.get("/accounts/:id", async (req) => {
			const { id } = parse(idParams, req.params);
			return service.get(req.userId, id);
		});

		app.patch("/accounts/:id", async (req) => {
			const { id } = parse(idParams, req.params);
			return service.update(
				req.userId,
				id,
				parse(updateAccountInput, req.body),
			);
		});

		app.post("/accounts/:id/reconcile", async (req) => {
			const { id } = parse(idParams, req.params);
			const { balance } = parse(reconcileAccountInput, req.body);
			return service.reconcile(req.userId, id, balance);
		});

		app.delete("/accounts/:id", async (req, reply) => {
			const { id } = parse(idParams, req.params);
			await service.remove(req.userId, id);
			return reply.status(204).send();
		});
	};
}
