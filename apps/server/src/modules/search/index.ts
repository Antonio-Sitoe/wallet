import { searchQuery } from "@wallet/shared";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";

import { parse } from "../../shared/utils/validate";
import { type SearchDeps, SearchService } from "./search.service";

export function createSearchModule(deps: SearchDeps) {
	const service = new SearchService(deps);
	const routes: FastifyPluginAsync = async (app) => {
		app.get("/search", async (req: FastifyRequest) =>
			service.search(req.userId, parse(searchQuery, req.query)),
		);
	};
	return { service, routes };
}
