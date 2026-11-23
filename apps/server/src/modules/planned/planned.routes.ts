import type { FastifyPluginAsync } from "fastify";

import type { PlannedController } from "./planned.controller";

export function plannedRoutes(
	controller: PlannedController,
): FastifyPluginAsync {
	return async (app) => {
		app.get("/planned-payments", controller.list);
		app.post("/planned-payments", controller.create);
		app.get("/planned-payments/occurrences", controller.occurrences);
		app.get("/planned-payments/reminders", controller.reminders);
		app.get("/planned-payments/:id", controller.get);
		app.patch("/planned-payments/:id", controller.update);
		app.delete("/planned-payments/:id", controller.remove);
		app.post("/planned-payments/:id/confirm", controller.confirm);
		app.post("/planned-payments/:id/skip", controller.skip);
		app.delete("/planned-payments/:id/occurrences/:dueDate", controller.undo);
	};
}
