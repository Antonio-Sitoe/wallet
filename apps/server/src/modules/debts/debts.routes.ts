import type { FastifyPluginAsync } from "fastify";

import type { DebtsController } from "./debts.controller";

export function debtsRoutes(controller: DebtsController): FastifyPluginAsync {
	return async (app) => {
		app.get("/debts", controller.list);
		app.post("/debts", controller.create);
		app.get("/debts/suggestions", controller.suggestions);
		app.post("/debts/suggestions/:key/ignore", controller.ignoreSuggestion);
		app.get("/debts/:id", controller.get);
		app.patch("/debts/:id", controller.update);
		app.delete("/debts/:id", controller.remove);
		app.post("/debts/:id/payments", controller.pay);
		app.delete("/debts/:id/payments/:transactionId", controller.removePayment);
	};
}
