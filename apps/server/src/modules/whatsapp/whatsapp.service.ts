import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import {
	WHATSAPP_CODE_LENGTH,
	WHATSAPP_CODE_MINUTES,
	type WhatsappStatus,
} from "@wallet/shared";

import { isUniqueViolation } from "../../shared/database/pg-errors";
import {
	AppError,
	conflict,
	unprocessable,
} from "../../shared/errors/app-error";
import { afterWriteReply, HELP, interpret } from "./whatsapp.interpreter";
import { readIncoming, uuidFromMessage } from "./whatsapp.message";
import type { WhatsappRepository } from "./whatsapp.repository";
import type {
	WhatsappConfig,
	WhatsappDeps,
	WhatsappLinkRow,
} from "./whatsapp.types";

const MARK = "🤖";
const MAX_CODES_PER_HOUR = 5;
const MIN_SECONDS_BETWEEN_CODES = 60;
const MAX_CODE_ATTEMPTS = 5;
const UNKNOWN_REPLY_HOURS = 24;

const hashCode = (userId: string, code: string) =>
	createHash("sha256").update(`${userId}:${code}`).digest("hex");

const sameHash = (a: string, b: string) =>
	a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

const disabled = () =>
	new AppError(
		503,
		"WHATSAPP_DISABLED",
		"O WhatsApp ainda não está configurado neste servidor",
	);

const phoneTaken = () =>
	conflict("WHATSAPP_PHONE_TAKEN", "Este número já está ligado a outra conta");

const tooMany = (message: string) =>
	new AppError(429, "WHATSAPP_TOO_MANY", message);

export class WhatsappService {
	constructor(
		private readonly repository: WhatsappRepository,
		private readonly deps: WhatsappDeps,
		private readonly config: WhatsappConfig,
	) {}

	private toStatus(row: WhatsappLinkRow | undefined): WhatsappStatus {
		return {
			enabled: !!this.config.sender,
			botNumber: this.config.botNumber,
			phone: row?.phone ?? null,
			verified: !!row?.verifiedAt,
			codeExpiresAt:
				!row?.verifiedAt && row?.codeExpiresAt
					? row.codeExpiresAt.toISOString()
					: null,
		};
	}

	private async send(phone: string, text: string) {
		await this.config.sender?.sendText(phone, `${MARK} ${text}`);
	}

	status = async (userId: string) =>
		this.toStatus(await this.repository.findByUser(userId));

	link = async (userId: string, phone: string) => {
		if (!this.config.sender) throw disabled();
		const current = await this.repository.findByUser(userId);
		if (current?.verifiedAt && current.phone === phone)
			return this.toStatus(current);
		const now = Date.now();
		const recent = (current?.codesSentAt ?? []).filter(
			(at) => now - Date.parse(at) < 60 * 60_000,
		);
		const last = recent.at(-1);
		if (last && now - Date.parse(last) < MIN_SECONDS_BETWEEN_CODES * 1000)
			throw tooMany("Espere um minuto antes de pedir outro código");
		if (recent.length >= MAX_CODES_PER_HOUR)
			throw tooMany("Pediu demasiados códigos. Tente outra vez daqui a uma hora");
		if (await this.repository.verifiedElsewhere(phone, userId))
			throw phoneTaken();
		const code = String(randomInt(0, 10 ** WHATSAPP_CODE_LENGTH)).padStart(
			WHATSAPP_CODE_LENGTH,
			"0",
		);
		try {
			await this.send(
				phone,
				`Código Wallet: ${code}\nVálido ${WHATSAPP_CODE_MINUTES} minutos. Se não pediu, ignore esta mensagem.`,
			);
		} catch {
			throw new AppError(
				502,
				"WHATSAPP_SEND_FAILED",
				"Não consegui enviar o código pelo WhatsApp. Confirme o número",
			);
		}
		await this.repository.savePending(userId, {
			phone,
			codeHash: hashCode(userId, code),
			codeExpiresAt: new Date(now + WHATSAPP_CODE_MINUTES * 60_000),
			codesSentAt: [...recent, new Date(now).toISOString()],
		});
		return this.status(userId);
	};

	verify = async (userId: string, code: string) => {
		const current = await this.repository.findByUser(userId);
		if (current?.verifiedAt) return this.toStatus(current);
		if (
			!current?.codeHash ||
			!current.codeExpiresAt ||
			current.codeExpiresAt.getTime() < Date.now()
		)
			throw unprocessable(
				"WHATSAPP_CODE_EXPIRED",
				"O código expirou. Peça um novo",
			);
		if (current.codeAttempts >= MAX_CODE_ATTEMPTS)
			throw tooMany("Demasiadas tentativas. Peça um novo código");
		if (!sameHash(current.codeHash, hashCode(userId, code))) {
			await this.repository.countAttempt(userId);
			throw unprocessable("WHATSAPP_CODE_WRONG", "Código errado");
		}
		try {
			await this.repository.markVerified(userId);
		} catch (error) {
			if (isUniqueViolation(error)) throw phoneTaken();
			throw error;
		}
		await this.send(
			current.phone,
			`Número ligado à sua conta Wallet.\n\n${HELP}`,
		).catch(() => undefined);
		return this.status(userId);
	};

	unlink = async (userId: string) => {
		await this.repository.remove(userId);
	};

	acceptsSecret(secret: unknown) {
		const expected = this.config.webhookSecret;
		if (!expected || typeof secret !== "string") return false;
		return sameHash(
			createHash("sha256").update(secret).digest("hex"),
			createHash("sha256").update(expected).digest("hex"),
		);
	}

	handleIncoming = async (body: unknown) => {
		const message = readIncoming(body);
		if (!message) return;
		if (!(await this.repository.claimMessage(message.messageId))) return;
		const userId = await this.repository.userByVerifiedPhone(message.phone);
		if (!userId) {
			const since = new Date(Date.now() - UNKNOWN_REPLY_HOURS * 3_600_000);
			if (await this.repository.claimUnknownReply(message.phone, since))
				await this.send(
					message.phone,
					"Este número não está ligado a uma conta Wallet. Ligue-o no app em Definições › WhatsApp.",
				);
			return;
		}
		const [accounts, categories] = await Promise.all([
			this.deps.accounts.list(userId),
			this.deps.categories.list(userId),
		]);
		const plan = interpret(message.text, accounts, categories);
		if (plan.kind === "silent") return;
		if (plan.kind === "reply") return this.send(message.phone, plan.text);
		const id = uuidFromMessage(message.messageId);
		const occurredAt = new Date();
		try {
			if (plan.kind === "transaction")
				await this.deps.transactions.create(userId, {
					id,
					type: plan.type,
					accountId: plan.accountId,
					categoryId: plan.categoryId,
					amount: plan.amount,
					occurredAt,
					note: plan.note,
				});
			else
				await this.deps.transactions.createTransfer(userId, {
					id,
					fromAccountId: plan.fromAccountId,
					toAccountId: plan.toAccountId,
					amount: plan.amount,
					occurredAt,
					note: plan.note,
				});
		} catch (error) {
			const reason = error instanceof Error ? error.message : "erro inesperado";
			return this.send(message.phone, `❌ Não gravei: ${reason}`);
		}
		const after = await this.deps.accounts.list(userId);
		return this.send(
			message.phone,
			afterWriteReply(plan.summary, plan.accountIds, after),
		);
	};
}

