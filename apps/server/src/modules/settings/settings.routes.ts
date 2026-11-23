import type { FastifyPluginAsync } from "fastify";

import type { SettingsController } from "./settings.controller";

export function settingsRoutes(
	controller: SettingsController,
): FastifyPluginAsync {
	return async (app) => {
		app.get("/settings/preferences", controller.preferences);
		app.patch("/settings/preferences", controller.updatePreferences);
		app.get("/settings/profile", controller.profile);
		app.patch("/settings/profile", controller.updateProfile);
		app.delete("/settings/profile", controller.deleteProfile);
		app.put("/settings/pin", controller.setPin);
		app.delete("/settings/pin", controller.removePin);
		app.post("/settings/pin/verify", controller.verifyPin);
		app.get("/settings/templates", controller.templates);
		app.post("/settings/templates", controller.createTemplate);
		app.put("/settings/templates/order", controller.reorderTemplates);
		app.patch("/settings/templates/:id", controller.updateTemplate);
		app.delete("/settings/templates/:id", controller.removeTemplate);
		app.get("/settings/export", controller.export);
	};
}
