import type { FastifyPluginAsync } from "fastify";

import type { ImportsController } from "./imports.controller";

const IMPORT_BODY_LIMIT = 25 * 1024 * 1024;

export function importsRoutes(
	controller: ImportsController,
): FastifyPluginAsync {
	return async (app) => {
		const upload = { bodyLimit: IMPORT_BODY_LIMIT };
		app.get("/imports", controller.list);
		app.post("/imports/wallet", upload, controller.createWalletImport);
		app.post("/imports/sheet", upload, controller.previewSheet);
		app.get("/imports/sheet/:id", controller.getSheet);
		app.post("/imports/sheet/:id/commit", controller.commitSheet);
		app.get("/imports/:id", controller.get);
		app.post("/imports/:id/commit", controller.commit);
		app.delete("/imports/:id", controller.remove);
	};
}
