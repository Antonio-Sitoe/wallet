import type { Database } from "@wallet/db";

import { SettingsController } from "./settings.controller";
import { SettingsRepository } from "./settings.repository";
import { settingsRoutes } from "./settings.routes";
import { SettingsService } from "./settings.service";
import type { SettingsDeps } from "./settings.types";

export { SettingsService } from "./settings.service";

export function createSettingsModule(db: Database, deps: SettingsDeps) {
	const repository = new SettingsRepository(db);
	const service = new SettingsService(repository, deps);
	const controller = new SettingsController(service);
	return { service, routes: settingsRoutes(controller) };
}
