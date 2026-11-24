import type {
	transactionTemplates,
	userPreferences,
} from "@wallet/db/schema/settings";

export type PreferencesRow = typeof userPreferences.$inferSelect;
export type PreferencesPatch = Partial<
	Omit<typeof userPreferences.$inferInsert, "userId" | "updatedAt">
>;
export type TemplateRow = typeof transactionTemplates.$inferSelect;
export type NewTemplateRow = typeof transactionTemplates.$inferInsert;

export type ExportRow = {
	occurredAt: Date;
	referenceMonth: string;
	type: string;
	amount: number;
	account: string;
	category: string | null;
	parentCategory: string | null;
	payee: string | null;
	labels: string[];
	note: string | null;
};

export type SettingsDeps = {
	accounts: {
		assertOwned(userId: string, ids: string[]): Promise<void>;
	};
	categories: {
		assertOwned(userId: string, ids: string[]): Promise<void>;
	};
};
