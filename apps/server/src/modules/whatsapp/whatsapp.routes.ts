import type { FastifyPluginAsync } from "fastify";

import type { WhatsappController } from "./whatsapp.controller";

export function whatsappRoutes(
	controller: WhatsappController,
): FastifyPluginAsync {
	return async (app) => {
		app.get("/whatsapp", controller.status);
		app.post("/whatsapp/link", controller.link);
		app.post("/whatsapp/verify", controller.verify);
		app.delete("/whatsapp", controller.unlink);
	};
}

export function whatsappWebhookRoutes(
	controller: WhatsappController,
): FastifyPluginAsync {
	return async (app) => {
		app.post("/webhooks/whatsapp", controller.webhook);
	};
}
