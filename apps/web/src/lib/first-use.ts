import type { Account, ImportBatchSummary } from "@wallet/shared";
import { api } from "@/lib/api";

export async function isFirstUse() {
	try {
		const [accounts, imports] = await Promise.all([
			api<Account[]>("/accounts", { query: { includeArchived: true } }),
			api<ImportBatchSummary[]>("/imports"),
		]);
		return accounts.length === 0 && imports.length === 0;
	} catch {
		return false;
	}
}
