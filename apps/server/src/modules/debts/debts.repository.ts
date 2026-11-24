import type { Database } from "@wallet/db";
import { debtIgnoredPeople, debts } from "@wallet/db/schema/debts";
import { transactions } from "@wallet/db/schema/transactions";
import { and, asc, desc, eq, inArray, isNull, like, or } from "drizzle-orm";

import type { UpdateDebtInput } from "./debts.schema";
import type {
	DebtPaymentRow,
	DebtRow,
	LoanNoteRow,
	NewDebtRow,
} from "./debts.types";

const owned = (userId: string, id: string) =>
	and(eq(debts.userId, userId), eq(debts.id, id));

export class DebtsRepository {
	constructor(private readonly db: Database) {}

	list(userId: string, includeArchived: boolean): Promise<DebtRow[]> {
		return this.db
			.select()
			.from(debts)
			.where(
				and(
					eq(debts.userId, userId),
					includeArchived ? undefined : eq(debts.archived, false),
				),
			)
			.orderBy(asc(debts.createdAt));
	}

	async findById(userId: string, id: string): Promise<DebtRow | undefined> {
		const [row] = await this.db.select().from(debts).where(owned(userId, id));
		return row;
	}

	async insert(row: NewDebtRow): Promise<DebtRow> {
		const [created] = await this.db.insert(debts).values(row).returning();
		return created!;
	}

	async update(userId: string, id: string, input: UpdateDebtInput) {
		await this.db.update(debts).set(input).where(owned(userId, id));
	}

	async delete(userId: string, id: string) {
		await this.db.delete(debts).where(owned(userId, id));
	}

	payments(userId: string, debtIds: string[]): Promise<DebtPaymentRow[]> {
		if (debtIds.length === 0) return Promise.resolve([]);
		return this.db
			.select({
				debtId: transactions.debtId,
				transactionId: transactions.id,
				occurredAt: transactions.occurredAt,
				accountId: transactions.accountId,
				amount: transactions.amount,
				note: transactions.note,
			})
			.from(transactions)
			.where(
				and(
					eq(transactions.userId, userId),
					inArray(transactions.debtId, debtIds),
				),
			)
			.orderBy(desc(transactions.occurredAt))
			.then((rows) =>
				rows.map((r) => ({
					...r,
					debtId: r.debtId!,
					amount: Math.abs(r.amount),
				})),
			);
	}

	async ignoredKeys(userId: string): Promise<Set<string>> {
		const rows = await this.db
			.select({ key: debtIgnoredPeople.personKey })
			.from(debtIgnoredPeople)
			.where(eq(debtIgnoredPeople.userId, userId));
		return new Set(rows.map((r) => r.key));
	}

	async ignore(userId: string, personKey: string) {
		await this.db
			.insert(debtIgnoredPeople)
			.values({ userId, personKey })
			.onConflictDoNothing();
	}

	loanNotes(userId: string): Promise<LoanNoteRow[]> {
		return this.db
			.select({
				type: transactions.type,
				amount: transactions.amount,
				note: transactions.note,
			})
			.from(transactions)
			.where(
				and(
					eq(transactions.userId, userId),
					isNull(transactions.debtId),
					or(like(transactions.note, "%→%"), like(transactions.note, "%->%")),
				),
			);
	}
}
