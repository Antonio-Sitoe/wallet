import type { Database } from "@wallet/db";

import { CategoriesController } from "./categories.controller";
import { CategoriesRepository } from "./categories.repository";
import { categoriesRoutes } from "./categories.routes";
import { CategoriesService } from "./categories.service";
import type { CategoryActivityPort } from "./categories.types";

export { SYSTEM_SLUGS } from "./categories.defaults";
export { CategoriesService } from "./categories.service";
export type { CategoryActivityPort } from "./categories.types";

export function createCategoriesModule(
	db: Database,
	deps: { activity: CategoryActivityPort },
) {
	const repository = new CategoriesRepository(db);
	const service = new CategoriesService(repository, deps.activity);
	const controller = new CategoriesController(service);
	return { service, routes: categoriesRoutes(controller) };
}
