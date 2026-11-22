import {
	createTransactionInput,
	createTransferInput,
	idParams,
	listTransactionsQuery,
	updateTransactionInput,
	updateTransferInput,
} from "@wallet/shared";
import type { FastifyPluginAsync } from "fastify";

import { parse } from "../../lib/validate";
import type { TransactionsService } from "./service";

export function transactionsRoutes(
	service: TransactionsService,
): FastifyPluginAsync {
	return async (app) => {
		app.get("/transactions", async (req) =>
			service.list(req.userId, parse(listTransactionsQuery, req.query)),
		);

		app.post("/transactions", async (req, reply) => {
			const transaction = await service.create(
				req.userId,
				parse(createTransactionInput, req.body),
			);
			return reply.status(201).send(transaction);
		});

		app.get("/transactions/:id", async (req) => {
			const { id } = parse(idParams, req.params);
			return service.get(req.userId, id);
		});

		app.patch("/transactions/:id", async (req) => {
			const { id } = parse(idParams, req.params);
			return service.update(
				req.userId,
				id,
				parse(updateTransactionInput, req.body),
			);
		});

		app.delete("/transactions/:id", async (req, reply) => {
			const { id } = parse(idParams, req.params);
			await service.remove(req.userId, id);
			return reply.status(204).send();
		});

		app.post("/transfers", async (req, reply) => {
			const transfer = await service.createTransfer(
				req.userId,
				parse(createTransferInput, req.body),
			);
			return reply.status(201).send(transfer);
		});

		app.get("/transfers/:id", async (req) => {
			const { id } = parse(idParams, req.params);
			return service.getTransfer(req.userId, id);
		});

		app.patch("/transfers/:id", async (req) => {
			const { id } = parse(idParams, req.params);
			return service.updateTransfer(
				req.userId,
				id,
				parse(updateTransferInput, req.body),
			);
		});

		app.delete("/transfers/:id", async (req, reply) => {
			const { id } = parse(idParams, req.params);
			await service.removeTransfer(req.userId, id);
			return reply.status(204).send();
		});
	};
}
