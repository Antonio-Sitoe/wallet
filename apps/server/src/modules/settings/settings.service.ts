import {
	AppError,
	notFound,
	unprocessable,
} from "../../shared/errors/app-error";
import { exportTable, toCsv, toXlsx } from "./settings.export";
import { hashPin, lockDuration, pinMatches } from "./settings.pin";
import type { SettingsRepository } from "./settings.repository";
import {
	type CheckConfirmation,
	type CreateTemplateInput,
	DEFAULT_NOTIFICATIONS,
	type Density,
	type ExportFormat,
	type NotificationPreferences,
	type NumberFormat,
	PIN_MAX_ATTEMPTS,
	type PinCheck,
	type Preferences,
	type Profile,
	type SetPinInput,
	type ShortcutOverrides,
	type Theme,
	type TransactionTemplate,
	type UpdatePreferencesInput,
	type UpdateProfileInput,
	type UpdateTemplateInput,
} from "./settings.schema";
import type {
	PreferencesRow,
	SettingsDeps,
	TemplateRow,
} from "./settings.types";

const toPreferences = (row: PreferencesRow): Preferences => ({
	theme: row.theme as Theme,
	hideMoney: row.hideMoney,
	density: row.density as Density,
	numberFormat: row.numberFormat as NumberFormat,
	confirmOnCheck: row.confirmOnCheck as CheckConfirmation,
	expectedIncome: row.expectedIncome,
	salaryAccountId: row.salaryAccountId,
	notifications: {
		...DEFAULT_NOTIFICATIONS,
		...(row.notifications as Partial<NotificationPreferences>),
	},
	shortcuts: (row.shortcuts ?? {}) as ShortcutOverrides,
	hasPin: !!row.pinHash,
});

const toTemplate = (row: TemplateRow): TransactionTemplate => ({
	id: row.id,
	name: row.name,
	type: row.type as TransactionTemplate["type"],
	amount: row.amount,
	accountId: row.accountId,
	toAccountId: row.toAccountId,
	categoryId: row.categoryId,
	payee: row.payee,
	note: row.note,
	position: row.position,
});

const pinLocked = (until: Date) =>
	new AppError(
		423,
		"PIN_LOCKED",
		"Demasiadas tentativas erradas. Tente mais tarde.",
		{ lockedUntil: until.toISOString() },
	);

export class SettingsService {
	constructor(
		private readonly repository: SettingsRepository,
		private readonly deps: SettingsDeps,
	) {}

	async preferences(userId: string) {
		return toPreferences(await this.repository.preferences(userId));
	}

	async updatePreferences(userId: string, input: UpdatePreferencesInput) {
		if (input.salaryAccountId)
			await this.deps.accounts.assertOwned(userId, [input.salaryAccountId]);
		const { notifications, ...rest } = input;
		const current = await this.repository.preferences(userId);
		const row = await this.repository.updatePreferences(userId, {
			...rest,
			...(notifications
				? {
						notifications: {
							...(current.notifications as object),
							...notifications,
						},
					}
				: {}),
		});
		return toPreferences(row);
	}

	async profile(userId: string): Promise<Profile> {
		const row = await this.repository.profile(userId);
		if (!row) throw notFound("Utilizador");
		return {
			id: row.id,
			name: row.name,
			email: row.email,
			image: row.image,
			createdAt: row.createdAt.toISOString(),
		};
	}

	async updateProfile(userId: string, input: UpdateProfileInput) {
		if (Object.keys(input).length > 0)
			await this.repository.updateProfile(userId, input);
		return this.profile(userId);
	}

	async deleteProfile(userId: string, email: string) {
		const profile = await this.profile(userId);
		if (profile.email.toLowerCase() !== email.trim().toLowerCase())
			throw unprocessable(
				"EMAIL_MISMATCH",
				"O email não coincide com o da conta",
			);
		await this.repository.deleteUser(userId);
	}

	async checkPin(userId: string, pin: string): Promise<PinCheck> {
		const row = await this.repository.preferences(userId);
		if (!row.pinHash) throw unprocessable("NO_PIN", "Ainda não definiu um PIN");
		const now = new Date();
		if (row.pinLockedUntil && row.pinLockedUntil > now)
			return {
				ok: false,
				attemptsLeft: 0,
				lockedUntil: row.pinLockedUntil.toISOString(),
			};
		if (await pinMatches(pin, row.pinHash)) {
			if (row.pinFailedAttempts > 0 || row.pinLockedUntil)
				await this.repository.updatePreferences(userId, {
					pinFailedAttempts: 0,
					pinLockedUntil: null,
				});
			return { ok: true, attemptsLeft: PIN_MAX_ATTEMPTS, lockedUntil: null };
		}
		const failed = row.pinFailedAttempts + 1;
		const locked = failed % PIN_MAX_ATTEMPTS === 0;
		const lockedUntil = locked
			? new Date(now.getTime() + lockDuration(failed, PIN_MAX_ATTEMPTS))
			: null;
		await this.repository.updatePreferences(userId, {
			pinFailedAttempts: failed,
			pinLockedUntil: lockedUntil,
		});
		return {
			ok: false,
			attemptsLeft: locked ? 0 : PIN_MAX_ATTEMPTS - (failed % PIN_MAX_ATTEMPTS),
			lockedUntil: lockedUntil?.toISOString() ?? null,
		};
	}

	private async requirePin(userId: string, pin: string | undefined) {
		const check = await this.checkPin(userId, pin ?? "");
		if (check.ok) return;
		if (check.lockedUntil) throw pinLocked(new Date(check.lockedUntil));
		throw unprocessable("WRONG_PIN", "PIN errado", {
			attemptsLeft: check.attemptsLeft,
		});
	}

	async setPin(userId: string, input: SetPinInput) {
		const row = await this.repository.preferences(userId);
		if (row.pinHash) await this.requirePin(userId, input.currentPin);
		await this.repository.updatePreferences(userId, {
			pinHash: await hashPin(input.pin),
			pinFailedAttempts: 0,
			pinLockedUntil: null,
		});
		return this.preferences(userId);
	}

	async removePin(userId: string, pin: string) {
		await this.requirePin(userId, pin);
		await this.repository.updatePreferences(userId, {
			pinHash: null,
			pinFailedAttempts: 0,
			pinLockedUntil: null,
		});
		return this.preferences(userId);
	}

	async templates(userId: string) {
		return (await this.repository.templates(userId)).map(toTemplate);
	}

	private async assertTemplateRefs(userId: string, input: UpdateTemplateInput) {
		const accountIds = [input.accountId, input.toAccountId].filter(
			(v): v is string => !!v,
		);
		if (accountIds.length)
			await this.deps.accounts.assertOwned(userId, accountIds);
		if (input.categoryId)
			await this.deps.categories.assertOwned(userId, [input.categoryId]);
		if (
			input.accountId &&
			input.toAccountId &&
			input.accountId === input.toAccountId
		)
			throw unprocessable(
				"SAME_ACCOUNT",
				"A conta de origem e a de destino têm de ser diferentes",
			);
	}

	async createTemplate(userId: string, input: CreateTemplateInput) {
		await this.assertTemplateRefs(userId, input);
		const current = await this.repository.templates(userId);
		const row = await this.repository.insertTemplate({
			userId,
			name: input.name,
			type: input.type,
			amount: input.amount ?? null,
			accountId: input.accountId ?? null,
			toAccountId:
				input.type === "transfer" ? (input.toAccountId ?? null) : null,
			categoryId: input.type === "transfer" ? null : (input.categoryId ?? null),
			payee: input.payee ?? null,
			note: input.note ?? null,
			position: current.length,
		});
		return toTemplate(row);
	}

	async updateTemplate(userId: string, id: string, input: UpdateTemplateInput) {
		await this.assertTemplateRefs(userId, input);
		const row = await this.repository.updateTemplate(userId, id, input);
		if (!row) throw notFound("Modelo");
		return toTemplate(row);
	}

	async removeTemplate(userId: string, id: string) {
		if (!(await this.repository.deleteTemplate(userId, id)))
			throw notFound("Modelo");
	}

	async reorderTemplates(userId: string, ids: string[]) {
		const current = await this.repository.templates(userId);
		const known = new Set(current.map((t) => t.id));
		if (ids.length !== known.size || ids.some((id) => !known.has(id)))
			throw unprocessable(
				"INVALID_ORDER",
				"A ordem tem de incluir todos os modelos, uma vez cada",
			);
		await this.repository.setTemplateOrder(userId, ids);
		return this.templates(userId);
	}

	async export(userId: string, format: ExportFormat) {
		const table = exportTable(await this.repository.exportRows(userId));
		const day = new Date().toISOString().slice(0, 10);
		if (format === "xlsx")
			return {
				filename: `wallet-${day}.xlsx`,
				contentType:
					"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				body: Buffer.from(toXlsx(table)),
			};
		return {
			filename: `wallet-${day}.csv`,
			contentType: "text/csv; charset=utf-8",
			body: toCsv(table),
		};
	}
}
