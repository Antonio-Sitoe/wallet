import {
	createCategoryInput,
	idParams,
	setWalletMappingInput,
	updateCategoryInput,
} from "@wallet/shared";
import type { FastifyPluginAsync } from "fastify";

import { parse } from "../../lib/validate";
import type { CategoriesService } from "./service";

export function categoriesRoutes(
	service: CategoriesService,
): FastifyPluginAsync {
	return async (app) => {
		app.get("/categories", async (req) => service.list(req.userId));

		app.post("/categories", async (req, reply) => {
			const category = await service.create(
				req.userId,
				parse(createCategoryInput, req.body),
			);
			return reply.status(201).send(category);
		});

		app.patch("/categories/:id", async (req) => {
			const { id } = parse(idParams, req.params);
			return service.update(
				req.userId,
				id,
				parse(updateCategoryInput, req.body),
			);
		});

		app.delete("/categories/:id", async (req, reply) => {
			const { id } = parse(idParams, req.params);
			await service.remove(req.userId, id);
			return reply.status(204).send();
		});

		app.get("/categories/wallet-map", async (req) =>
			service.getWalletMap(req.userId),
		);

		app.put("/categories/wallet-map", async (req) => {
			await service.setWalletMappings(req.userId, [
				parse(setWalletMappingInput, req.body),
			]);
			return service.getWalletMap(req.userId);
		});
	};
}
