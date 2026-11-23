import type { FastifyPluginAsync } from "fastify";

import type { GoalsController } from "./goals.controller";

export function goalsRoutes(controller: GoalsController): FastifyPluginAsync {
	return async (app) => {
		app.get("/goals", controller.list);
		app.post("/goals", controller.create);
		app.get("/goals/:id", controller.get);
		app.patch("/goals/:id", controller.update);
		app.delete("/goals/:id", controller.remove);
		app.post("/goals/:id/contribute", controller.contribute);
		app.post("/goals/:id/parts", controller.addPart);
		app.patch("/goal-parts/:id", controller.updatePart);
		app.delete("/goal-parts/:id", controller.removePart);
	};
}
