import type { FastifyReply, FastifyRequest } from "fastify";

import { parse } from "../../shared/utils/validate";
import {
	commitImportInput,
	commitSheetInput,
	idParams,
	sheetImportInput,
	walletImportInput,
} from "./imports.schema";
import type { ImportsService } from "./imports.service";
import type { SheetImportService } from "./imports.sheet.service";

export class ImportsController {
	constructor(
		private readonly service: ImportsService,
		private readonly sheet: SheetImportService,
	) {}

	list = async (req: FastifyRequest) => this.service.list(req.userId);

	createWalletImport = async (req: FastifyRequest, reply: FastifyReply) => {
		const preview = await this.service.createWalletImport(
			req.userId,
			parse(walletImportInput, req.body),
		);
		return reply.status(201).send(preview);
	};

	get = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.service.get(req.userId, id);
	};

	commit = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.service.commit(
			req.userId,
			id,
			parse(commitImportInput, req.body ?? {}),
		);
	};

	remove = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.service.remove(req.userId, id);
	};

	previewSheet = async (req: FastifyRequest, reply: FastifyReply) => {
		const preview = await this.sheet.preview(
			req.userId,
			parse(sheetImportInput, req.body),
		);
		return reply.status(201).send(preview);
	};

	getSheet = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.sheet.get(req.userId, id);
	};

	commitSheet = async (req: FastifyRequest) => {
		const { id } = parse(idParams, req.params);
		return this.sheet.commit(
			req.userId,
			id,
			parse(commitSheetInput, req.body ?? {}),
		);
	};
}
