import type { FastifyPluginAsync } from "fastify";

import type { TransactionsController } from "./transactions.controller";

export function transactionsRoutes(
	controller: TransactionsController,
): FastifyPluginAsync {
	return async (app) => {
		app.get("/transactions", controller.list);
		app.get("/transactions/labels", controller.labels);
		app.post("/transactions", controller.create);
		app.get("/transactions/:id", controller.get);
		app.patch("/transactions/:id", controller.update);
		app.delete("/transactions/:id", controller.remove);

		app.post("/transfers", controller.createTransfer);
		app.get("/transfers/:id", controller.getTransfer);
		app.patch("/transfers/:id", controller.updateTransfer);
		app.delete("/transfers/:id", controller.removeTransfer);
	};
}
