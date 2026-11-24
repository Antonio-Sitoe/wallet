import type { Database } from "@wallet/db";
import {
	createConversationInput,
	idParams,
	listConversationsQuery,
	sendMessageInput,
	updateConversationInput,
} from "@wallet/shared";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

import { parse } from "../../shared/utils/validate";
import {
	type AssistantProvider,
	PlaceholderProvider,
} from "./assistant.provider";
import { AssistantRepository } from "./assistant.repository";
import { AssistantService } from "./assistant.service";

export type { AssistantProvider } from "./assistant.provider";

export function createAssistantModule(
	db: Database,
	provider: AssistantProvider = new PlaceholderProvider(),
) {
	const service = new AssistantService(new AssistantRepository(db), provider);
	const routes: FastifyPluginAsync = async (app) => {
		app.get("/assistant/status", async () => service.status());
		app.get("/assistant/conversations", async (req: FastifyRequest) =>
			service.list(req.userId, parse(listConversationsQuery, req.query).q),
		);
		app.post(
			"/assistant/conversations",
			async (req: FastifyRequest, reply: FastifyReply) => {
				const { title } = parse(createConversationInput, req.body ?? {});
				return reply.status(201).send(await service.create(req.userId, title));
			},
		);
		app.get("/assistant/conversations/:id", async (req: FastifyRequest) =>
			service.get(req.userId, parse(idParams, req.params).id),
		);
		app.patch("/assistant/conversations/:id", async (req: FastifyRequest) =>
			service.update(
				req.userId,
				parse(idParams, req.params).id,
				parse(updateConversationInput, req.body),
			),
		);
		app.delete(
			"/assistant/conversations/:id",
			async (req: FastifyRequest, reply: FastifyReply) => {
				await service.remove(req.userId, parse(idParams, req.params).id);
				return reply.status(204).send();
			},
		);
		app.post(
			"/assistant/conversations/:id/messages",
			async (req: FastifyRequest, reply: FastifyReply) => {
				const result = await service.send(
					req.userId,
					parse(idParams, req.params).id,
					parse(sendMessageInput, req.body).content,
				);
				return reply.status(201).send(result);
			},
		);
		app.get(
			"/assistant/conversations/:id/export",
			async (req: FastifyRequest, reply: FastifyReply) => {
				const file = await service.exportMarkdown(
					req.userId,
					parse(idParams, req.params).id,
				);
				return reply
					.header("content-type", "text/markdown; charset=utf-8")
					.header(
						"content-disposition",
						`attachment; filename="${file.filename}"`,
					)
					.send(file.body);
			},
		);
	};
	return { service, routes };
}
