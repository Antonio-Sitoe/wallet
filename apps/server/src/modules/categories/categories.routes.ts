import type { FastifyPluginAsync } from "fastify";

import type { CategoriesController } from "./categories.controller";

export function categoriesRoutes(
	controller: CategoriesController,
): FastifyPluginAsync {
	return async (app) => {
		app.get("/categories", controller.list);
		app.post("/categories", controller.create);
		app.patch("/categories/:id", controller.update);
		app.delete("/categories/:id", controller.remove);
		app.get("/categories/wallet-map", controller.getWalletMap);
		app.put("/categories/wallet-map", controller.setWalletMapping);
	};
}
