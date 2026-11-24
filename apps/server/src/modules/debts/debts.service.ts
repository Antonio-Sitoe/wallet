import {
	conflict,
	notFound,
	unprocessable,
} from "../../shared/errors/app-error";
import { firstName, loanSuggestions } from "./debts.notes";
import type { DebtsRepository } from "./debts.repository";
import type {
	CreateDebtInput,
	Debt,
	DebtSuggestion,
	PayDebtInput,
	UpdateDebtInput,
} from "./debts.schema";
import type { DebtPaymentRow, DebtRow, DebtsDeps } from "./debts.types";

const PAYMENT_CATEGORY = {
	owed_to_me: "dividas.recebidas",
	i_owe: "dividas.pagas",
} as const;

const toDebt = (row: DebtRow, payments: DebtPaymentRow[]): Debt => {
	const own = payments.filter((p) => p.debtId === row.id);
	return {
		id: row.id,
		person: row.person,
		direction: row.direction,
		amount: row.amount,
		paid: own.reduce((s, p) => s + p.amount, 0),
		note: row.note,
		remindOn: row.remindOn,
		archived: row.archived,
		imported: !!row.importBatchId,
		createdAt: row.createdAt.toISOString(),
		payments: own.map(({ debtId: _debtId, ...p }) => ({
			...p,
			occurredAt: p.occurredAt.toISOString(),
		})),
	};
};

export class DebtsService {
	constructor(
		private readonly repository: DebtsRepository,
		private readonly deps: DebtsDeps,
	) {}

	async list(
		userId: string,
		options: { includeArchived: boolean },
	): Promise<Debt[]> {
		const rows = await this.repository.list(userId, options.includeArchived);
		const payments = await this.repository.payments(
			userId,
			rows.map((r) => r.id),
		);
		return rows.map((r) => toDebt(r, payments));
	}

	async get(userId: string, id: string): Promise<Debt> {
		const row = await this.find(userId, id);
		return toDebt(row, await this.repository.payments(userId, [row.id]));
	}

	async create(userId: string, input: CreateDebtInput): Promise<Debt> {
		const row = await this.repository.insert({
			userId,
			person: input.person,
			direction: input.direction,
			amount: input.amount,
			note: input.note ?? null,
			remindOn: input.remindOn ?? null,
		});
		return this.get(userId, row.id);
	}

	async update(
		userId: string,
		id: string,
		input: UpdateDebtInput,
	): Promise<Debt> {
		const debt = await this.get(userId, id);
		if (input.amount !== undefined && input.amount < debt.paid)
			throw unprocessable(
				"AMOUNT_BELOW_PAID",
				"O valor não pode ser menor do que o já pago",
			);
		await this.repository.update(userId, id, input);
		return this.get(userId, id);
	}

	async remove(userId: string, id: string) {
		await this.find(userId, id);
		await this.repository.delete(userId, id);
	}

	async pay(userId: string, id: string, input: PayDebtInput): Promise<Debt> {
		const debt = await this.get(userId, id);
		if (debt.archived)
			throw conflict("DEBT_ARCHIVED", "Esta dívida está arquivada");
		const remaining = debt.amount - debt.paid;
		if (input.amount > remaining)
			throw unprocessable(
				"PAYMENT_TOO_LARGE",
				"O valor é maior do que o que falta",
			);
		await this.deps.accounts.assertOwned(userId, [input.accountId]);
		const slugs = await this.deps.categories.idsBySlug(userId);
		const receiving = debt.direction === "owed_to_me";
		await this.deps.transactions.create(
			userId,
			{
				type: receiving ? "income" : "expense",
				accountId: input.accountId,
				categoryId: slugs.get(PAYMENT_CATEGORY[debt.direction]) ?? null,
				amount: input.amount,
				occurredAt: input.occurredAt ?? new Date(),
				note:
					input.note ??
					(receiving ? `${debt.person} → Eu` : `Eu → ${debt.person}`),
				payee: debt.person,
			},
			{ debtId: debt.id },
		);
		return this.get(userId, id);
	}

	async removePayment(
		userId: string,
		id: string,
		transactionId: string,
	): Promise<Debt> {
		const debt = await this.get(userId, id);
		if (!debt.payments.some((p) => p.transactionId === transactionId))
			throw notFound("Pagamento da dívida");
		await this.deps.transactions.remove(userId, transactionId);
		return this.get(userId, id);
	}

	async suggestions(userId: string): Promise<DebtSuggestion[]> {
		const [notes, ignored, existing] = await Promise.all([
			this.repository.loanNotes(userId),
			this.repository.ignoredKeys(userId),
			this.repository.list(userId, true),
		]);
		const taken = new Set(existing.map((d) => firstName(d.person)));
		return loanSuggestions(notes).filter(
			(s) => !ignored.has(s.key) && !taken.has(firstName(s.person)),
		);
	}

	async ignoreSuggestion(userId: string, key: string) {
		await this.repository.ignore(userId, key);
	}

	async importDebt(
		userId: string,
		input: {
			person: string;
			direction: Debt["direction"];
			amount: number;
			importBatchId: string;
		},
	) {
		const row = await this.repository.insert({ userId, ...input });
		return row.id;
	}

	async removeMany(userId: string, ids: string[]) {
		for (const id of ids) await this.repository.delete(userId, id);
	}

	private async find(userId: string, id: string) {
		const row = await this.repository.findById(userId, id);
		if (!row) throw notFound("Dívida");
		return row;
	}
}
