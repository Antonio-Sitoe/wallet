import type { FastifyReply, FastifyRequest } from "fastify";

import { unauthorized } from "../../shared/errors/app-error";
import { parse } from "../../shared/utils/validate";
import { linkWhatsappInput, verifyWhatsappInput } from "./whatsapp.schema";
import type { WhatsappService } from "./whatsapp.service";

export class WhatsappController {
	constructor(private readonly service: WhatsappService) {}

	status = async (req: FastifyRequest) => this.service.status(req.userId);

	link = async (req: FastifyRequest) =>
		this.service.link(req.userId, parse(linkWhatsappInput, req.body).phone);

	verify = async (req: FastifyRequest) =>
		this.service.verify(req.userId, parse(verifyWhatsappInput, req.body).code);

	unlink = async (req: FastifyRequest, reply: FastifyReply) => {
		await this.service.unlink(req.userId);
		return reply.status(204).send();
	};

	webhook = async (req: FastifyRequest) => {
		if (!this.service.acceptsSecret(req.headers["x-wallet-secret"]))
			throw unauthorized();
		await this.service.handleIncoming(req.body);
		return { ok: true };
	};
}
