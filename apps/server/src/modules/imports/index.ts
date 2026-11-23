import type { Database } from "@wallet/db";

import { ImportsController } from "./imports.controller";
import { ImportsRepository } from "./imports.repository";
import { importsRoutes } from "./imports.routes";
import { ImportsService } from "./imports.service";
import { SheetImportService } from "./imports.sheet.service";
import type { ImportsDeps, SheetImportDeps } from "./imports.types";

export { ImportsService } from "./imports.service";
export { SheetImportService } from "./imports.sheet.service";
export type { ImportsDeps, SheetImportDeps } from "./imports.types";

export function createImportsModule(
	db: Database,
	deps: ImportsDeps,
	sheetDeps: SheetImportDeps,
) {
	const repository = new ImportsRepository(db);
	const sheet = new SheetImportService(repository, sheetDeps);
	const service = new ImportsService(repository, deps, sheet);
	const controller = new ImportsController(service, sheet);
	return { service, sheet, routes: importsRoutes(controller) };
}
