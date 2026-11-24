import { z } from "zod";

import { type ShortcutOverrides, shortcutOverrides } from "../shortcuts";
import { cents, id, positiveCents } from "./common";

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const DENSITIES = ["compact", "comfortable"] as const;
export type Density = (typeof DENSITIES)[number];

export const NUMBER_FORMATS = ["space", "dot", "comma"] as const;
export type NumberFormat = (typeof NUMBER_FORMATS)[number];

export const CHECK_CONFIRMATIONS = ["always", "changed", "never"] as const;
export type CheckConfirmation = (typeof CHECK_CONFIRMATIONS)[number];

export const notificationPreferences = z.object({
	upcomingPayments: z.boolean(),
	unpaidItems: z.boolean(),
	debtReminders: z.boolean(),
	monthSummary: z.boolean(),
});
export type NotificationPreferences = z.infer<typeof notificationPreferences>;

export const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
	upcomingPayments: true,
	unpaidItems: true,
	debtReminders: true,
	monthSummary: false,
};

export type Preferences = {
	theme: Theme;
	hideMoney: boolean;
	density: Density;
	numberFormat: NumberFormat;
	confirmOnCheck: CheckConfirmation;
	expectedIncome: number | null;
	salaryAccountId: string | null;
	notifications: NotificationPreferences;
	shortcuts: ShortcutOverrides;
	hasPin: boolean;
};

export const updatePreferencesInput = z
	.object({
		theme: z.enum(THEMES),
		hideMoney: z.boolean(),
		density: z.enum(DENSITIES),
		numberFormat: z.enum(NUMBER_FORMATS),
		confirmOnCheck: z.enum(CHECK_CONFIRMATIONS),
		expectedIncome: cents.min(0).nullable(),
		salaryAccountId: id.nullable(),
		notifications: notificationPreferences.partial(),
		shortcuts: shortcutOverrides,
	})
	.partial();
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesInput>;

export type Profile = {
	id: string;
	name: string;
	email: string;
	image: string | null;
	createdAt: string;
};

export const AVATAR_MAX_LENGTH = 400_000;

export const updateProfileInput = z
	.object({
		name: z.string().trim().min(1).max(80),
		image: z
			.string()
			.max(AVATAR_MAX_LENGTH, "A imagem é grande demais")
			.regex(
				/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/,
				"Use uma imagem PNG, JPEG ou WebP",
			)
			.nullable(),
	})
	.partial();
export type UpdateProfileInput = z.infer<typeof updateProfileInput>;

export const deleteProfileInput = z.object({
	email: z.string().trim().min(1),
});

const pin = z.string().regex(/^\d{4,8}$/, "O PIN tem 4 a 8 dígitos");

export const setPinInput = z.object({
	pin,
	currentPin: z.string().optional(),
});
export type SetPinInput = z.infer<typeof setPinInput>;

export const verifyPinInput = z.object({ pin: z.string().min(1).max(8) });

export const PIN_MAX_ATTEMPTS = 5;

export type PinCheck = {
	ok: boolean;
	attemptsLeft: number;
	lockedUntil: string | null;
};

export const TEMPLATE_TYPES = ["expense", "income", "transfer"] as const;
export type TemplateType = (typeof TEMPLATE_TYPES)[number];

export type TransactionTemplate = {
	id: string;
	name: string;
	type: TemplateType;
	amount: number | null;
	accountId: string | null;
	toAccountId: string | null;
	categoryId: string | null;
	payee: string | null;
	note: string | null;
	position: number;
};

const templateFields = {
	name: z.string().trim().min(1).max(60),
	type: z.enum(TEMPLATE_TYPES),
	amount: positiveCents.nullable(),
	accountId: id.nullable(),
	toAccountId: id.nullable(),
	categoryId: id.nullable(),
	payee: z.string().trim().max(120).nullable(),
	note: z.string().trim().max(500).nullable(),
};

export const createTemplateInput = z.object({
	name: templateFields.name,
	type: templateFields.type,
	amount: templateFields.amount.optional(),
	accountId: templateFields.accountId.optional(),
	toAccountId: templateFields.toAccountId.optional(),
	categoryId: templateFields.categoryId.optional(),
	payee: templateFields.payee.optional(),
	note: templateFields.note.optional(),
});
export type CreateTemplateInput = z.infer<typeof createTemplateInput>;

export const updateTemplateInput = z.object(templateFields).partial();
export type UpdateTemplateInput = z.infer<typeof updateTemplateInput>;

export const reorderTemplatesInput = z.object({
	ids: z.array(id).max(100),
});

export const EXPORT_FORMATS = ["csv", "xlsx"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const exportQuery = z.object({
	format: z.enum(EXPORT_FORMATS).default("csv"),
});
