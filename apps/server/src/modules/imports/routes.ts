import { commitImportInput, idParams, walletImportInput } from "@wallet/shared";
import type { FastifyPluginAsync } from "fastify";

import { parse } from "../../lib/validate";
import type { ImportsService } from "./service";

/** Three overlapping exports of a few years are well under 5 MB; 25 MB leaves room. */
const IMPORT_BODY_LIMIT = 25 * 1024 * 1024;

export function importsRoutes(service: ImportsService): FastifyPluginAsync {
	return async (app) => {
		app.get("/imports", async (req) => service.list(req.userId));

		/** Upload CSV files as text; returns a draft preview. Nothing is written to transactions yet. */
		app.post(
			"/imports/wallet",
			{ bodyLimit: IMPORT_BODY_LIMIT },
			async (req, reply) => {
				const preview = await service.createWalletImport(
					req.userId,
					parse(walletImportInput, req.body),
				);
				return reply.status(201).send(preview);
			},
		);

		app.get("/imports/:id", async (req) => {
			const { id } = parse(idParams, req.params);
			return service.get(req.userId, id);
		});

		app.post("/imports/:id/commit", async (req) => {
			const { id } = parse(idParams, req.params);
			return service.commit(
				req.userId,
				id,
				parse(commitImportInput, req.body ?? {}),
			);
		});

		app.delete("/imports/:id", async (req) => {
			const { id } = parse(idParams, req.params);
			return service.remove(req.userId, id);
		});
	};
}
