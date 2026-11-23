import {
	createCardInput,
	idParams,
	reorderCardsInput,
	updateCardInput,
} from "@wallet/shared";
import type { FastifyPluginAsync } from "fastify";

import { parse } from "../../lib/validate";
import type { DashboardService } from "./service";

export function dashboardRoutes(service: DashboardService): FastifyPluginAsync {
	return async (app) => {
		app.get("/dashboard/cards", async (req) => service.list(req.userId));

		app.post("/dashboard/cards", async (req, reply) => {
			const card = await service.add(
				req.userId,
				parse(createCardInput, req.body),
			);
			return reply.status(201).send(card);
		});

		app.patch("/dashboard/cards/:id", async (req) => {
			const { id } = parse(idParams, req.params);
			return service.update(req.userId, id, parse(updateCardInput, req.body));
		});

		app.delete("/dashboard/cards/:id", async (req, reply) => {
			const { id } = parse(idParams, req.params);
			await service.remove(req.userId, id);
			return reply.status(204).send();
		});

		app.put("/dashboard/cards/order", async (req) => {
			const { ids } = parse(reorderCardsInput, req.body);
			return service.reorder(req.userId, ids);
		});

		app.post("/dashboard/cards/reset", async (req) =>
			service.reset(req.userId),
		);
	};
}
