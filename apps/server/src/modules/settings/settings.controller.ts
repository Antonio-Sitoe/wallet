import type { FastifyReply, FastifyRequest } from "fastify";

import { parse } from "../../shared/utils/validate";
import {
	createTemplateInput,
	deleteProfileInput,
	exportQuery,
	idParams,
	reorderTemplatesInput,
	setPinInput,
	updatePreferencesInput,
	updateProfileInput,
	updateTemplateInput,
	verifyPinInput,
} from "./settings.schema";
import type { SettingsService } from "./settings.service";

export class SettingsController {
	constructor(private readonly service: SettingsService) {}

	preferences = async (req: FastifyRequest) =>
		this.service.preferences(req.userId);

	updatePreferences = async (req: FastifyRequest) =>
		this.service.updatePreferences(
			req.userId,
			parse(updatePreferencesInput, req.body),
		);

	profile = async (req: FastifyRequest) => this.service.profile(req.userId);

	updateProfile = async (req: FastifyRequest) =>
		this.service.updateProfile(req.userId, parse(updateProfileInput, req.body));

	deleteProfile = async (req: FastifyRequest, reply: FastifyReply) => {
		const { email } = parse(deleteProfileInput, req.body);
		await this.service.deleteProfile(req.userId, email);
		return reply.status(204).send();
	};

	setPin = async (req: FastifyRequest) =>
		this.service.setPin(req.userId, parse(setPinInput, req.body));

	removePin = async (req: FastifyRequest) => {
		const { pin } = parse(verifyPinInput, req.body);
		return this.service.removePin(req.userId, pin);
	};

	verifyPin = async (req: FastifyRequest) => {
		const { pin } = parse(verifyPinInput, req.body);
		return this.service.checkPin(req.userId, pin);
	};

	templates = async (req: FastifyRequest) => this.service.templates(req.userId);

	createTemplate = async (req: FastifyRequest, reply: FastifyReply) => {
		const template = await this.service.createTemplate(
			req.userId,
			parse(createTemplateInput, req.body),
		);
		return reply.status(201).send(template);
	};

	updateTemplate = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.service.updateTemplate(
			req.userId,
			id,
			parse(updateTemplateInput, req.body),
		);
	};

	removeTemplate = async (req: FastifyRequest, reply: FastifyReply) => {
		const { id } = parse(idParams, req.params);
		await this.service.removeTemplate(req.userId, id);
		return reply.status(204).send();
	};

	reorderTemplates = async (req: FastifyRequest) => {
		const { ids } = parse(reorderTemplatesInput, req.body);
		return this.service.reorderTemplates(req.userId, ids);
	};

	export = async (req: FastifyRequest, reply: FastifyReply) => {
		const { format } = parse(exportQuery, req.query);
		const file = await this.service.export(req.userId, format);
		return reply
			.header("Content-Type", file.contentType)
			.header("Content-Disposition", `attachment; filename="${file.filename}"`)
			.send(file.body);
	};
}
