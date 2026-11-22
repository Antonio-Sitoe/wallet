import type { Database } from "@wallet/db";

import { categoriesRoutes } from "./routes";
import { type CategoryActivityPort, createCategoriesService } from "./service";

export { SYSTEM_SLUGS } from "./defaults";
export type { CategoriesService, CategoryActivityPort } from "./service";

/** Categories: two-level tree, default seed, Wallet name mapping. Owns `categories` and `wallet_category_map`. */
export function createCategoriesModule(
	db: Database,
	deps: { activity: CategoryActivityPort },
) {
	const service = createCategoriesService(db, deps.activity);
	return { service, routes: categoriesRoutes(service) };
}
