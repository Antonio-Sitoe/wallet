import type { Database } from "@wallet/db";

import { ShoppingController } from "./shopping.controller";
import { ShoppingRepository } from "./shopping.repository";
import { shoppingRoutes } from "./shopping.routes";
import { ShoppingService } from "./shopping.service";
import type { ShoppingDeps } from "./shopping.types";

export { ShoppingService } from "./shopping.service";

export function createShoppingModule(db: Database, deps: ShoppingDeps) {
	const repository = new ShoppingRepository(db);
	const service = new ShoppingService(repository, deps);
	const controller = new ShoppingController(service);
	return { service, routes: shoppingRoutes(controller) };
}
