import type { Database } from "@wallet/db";

import { importsRoutes } from "./routes";
import { createImportsService, type ImportsDeps } from "./service";

export type { ImportsDeps, ImportsService } from "./service";

/** Wallet CSV import: draft preview → commit → undo. Owns `import_batches`. */
export function createImportsModule(db: Database, deps: ImportsDeps) {
	const service = createImportsService(db, deps);
	return { service, routes: importsRoutes(service) };
}
