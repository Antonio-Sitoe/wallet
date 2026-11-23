import type { FastifyPluginAsync } from "fastify";

import type { AccountsController } from "./accounts.controller";

export function accountsRoutes(
	controller: AccountsController,
): FastifyPluginAsync {
	return async (app) => {
		app.get("/accounts", controller.list);
		app.post("/accounts", controller.create);
		app.post("/accounts/zero-balances", controller.zeroBalances);
		app.post("/accounts/reset", controller.resetData);
		app.get("/accounts/:id", controller.get);
		app.patch("/accounts/:id", controller.update);
		app.post("/accounts/:id/reconcile", controller.reconcile);
		app.delete("/accounts/:id", controller.remove);
	};
}
