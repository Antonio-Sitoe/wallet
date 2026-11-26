import type { Database } from "@wallet/db";

import { WhatsappController } from "./whatsapp.controller";
import { WhatsappRepository } from "./whatsapp.repository";
import { whatsappRoutes, whatsappWebhookRoutes } from "./whatsapp.routes";
import { WhatsappService } from "./whatsapp.service";
import type { WhatsappConfig, WhatsappDeps } from "./whatsapp.types";

export {
	createEvolutionSender,
	type WhatsappSender,
} from "./evolution.client";
export type { WhatsappConfig } from "./whatsapp.types";

export function createWhatsappModule(
	db: Database,
	deps: WhatsappDeps,
	config: WhatsappConfig,
) {
	const repository = new WhatsappRepository(db);
	const service = new WhatsappService(repository, deps, config);
	const controller = new WhatsappController(service);
	return {
		service,
		routes: whatsappRoutes(controller),
		webhookRoutes: whatsappWebhookRoutes(controller),
	};
}
