import type { FastifyPluginAsync } from "fastify";

import type { DashboardController } from "./dashboard.controller";

export function dashboardRoutes(
	controller: DashboardController,
): FastifyPluginAsync {
	return async (app) => {
		app.get("/dashboard/cards", controller.list);
		app.post("/dashboard/cards", controller.add);
		app.patch("/dashboard/cards/:id", controller.update);
		app.delete("/dashboard/cards/:id", controller.remove);
		app.put("/dashboard/cards/order", controller.reorder);
		app.post("/dashboard/cards/reset", controller.reset);
	};
}
