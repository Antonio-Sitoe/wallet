import { noticesQuery } from "@wallet/shared";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";

import { parse } from "../../shared/utils/validate";
import {
	type NotificationsDeps,
	NotificationsService,
} from "./notifications.service";

export type { NotificationsDeps } from "./notifications.service";

export function createNotificationsModule(deps: NotificationsDeps) {
	const service = new NotificationsService(deps);
	const routes: FastifyPluginAsync = async (app) => {
		app.get("/notifications", async (req: FastifyRequest) =>
			service.due(req.userId, parse(noticesQuery, req.query).today),
		);
	};
	return { service, routes };
}
