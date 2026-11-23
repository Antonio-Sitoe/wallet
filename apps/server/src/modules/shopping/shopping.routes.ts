import type { FastifyPluginAsync } from "fastify";

import type { ShoppingController } from "./shopping.controller";

export function shoppingRoutes(
	controller: ShoppingController,
): FastifyPluginAsync {
	return async (app) => {
		app.get("/shopping-lists", controller.list);
		app.post("/shopping-lists", controller.create);
		app.get("/shopping-lists/:id", controller.get);
		app.patch("/shopping-lists/:id", controller.update);
		app.delete("/shopping-lists/:id", controller.remove);
		app.post("/shopping-lists/:id/items", controller.addItem);
		app.patch("/shopping-lists/:id/items/:itemId", controller.updateItem);
		app.delete("/shopping-lists/:id/items/:itemId", controller.removeItem);
		app.post("/shopping-lists/:id/items/:itemId/buy", controller.buy);
		app.delete("/shopping-lists/:id/items/:itemId/buy", controller.unbuy);
	};
}
