import type { Database } from "@wallet/db";

import { importsRoutes } from "./routes";
import { createImportsService, type ImportsDeps } from "./service";
import {
	createSheetImportService,
	type SheetImportDeps,
} from "./sheet-service";

export type { ImportsDeps, ImportsService } from "./service";
export type { SheetImportDeps } from "./sheet-service";

/** Wallet CSV import: draft preview → commit → undo. Owns `import_batches`. */
export function createImportsModule(
	db: Database,
	deps: ImportsDeps,
	sheetDeps: SheetImportDeps,
) {
	const sheet = createSheetImportService(db, sheetDeps);
	const service = createImportsService(db, deps, sheet);
	return { service, sheet, routes: importsRoutes(service, sheet) };
}
