import {
	conflict,
	notFound,
	unprocessable,
} from "../../shared/errors/app-error";
import type { ShoppingRepository } from "./shopping.repository";
import type {
	AddShoppingItemInput,
	BuyShoppingItemInput,
	CreateShoppingListInput,
	ShoppingItem,
	ShoppingList,
	ShoppingListSummary,
	UpdateShoppingItemInput,
	UpdateShoppingListInput,
} from "./shopping.schema";
import type {
	ShoppingDeps,
	ShoppingItemWithPurchase,
	ShoppingListWithMonthItem,
} from "./shopping.types";

export const lineEstimate = (quantity: number, unitPrice: number | null) =>
	unitPrice === null ? 0 : Math.round(quantity * unitPrice);

const toItem = (row: ShoppingItemWithPurchase): ShoppingItem => ({
	id: row.id,
	name: row.name,
	quantity: row.quantity,
	unitPrice: row.unitPrice,
	estimated: lineEstimate(row.quantity, row.unitPrice),
	position: row.position,
	bought: !!row.transactionId,
	transactionId: row.transactionId,
	actual: row.purchase?.amount ?? null,
	accountId: row.purchase?.accountId ?? null,
	boughtAt: row.purchase?.occurredAt.toISOString() ?? null,
});

export function totalsOf(items: ShoppingItem[]) {
	const bought = items.filter((i) => i.bought);
	const sum = (list: ShoppingItem[], pick: (i: ShoppingItem) => number) =>
		list.reduce((s, i) => s + pick(i), 0);
	return {
		items: items.length,
		bought: bought.length,
		estimated: sum(items, (i) => i.estimated),
		estimatedBought: sum(bought, (i) => i.estimated),
		actual: sum(bought, (i) => i.actual ?? 0),
		estimatedLeft: sum(
			items.filter((i) => !i.bought),
			(i) => i.estimated,
		),
	};
}

const toSummary = (
	row: ShoppingListWithMonthItem,
	items: ShoppingItem[],
): ShoppingListSummary => ({
	id: row.id,
	name: row.name,
	accountId: row.accountId,
	categoryId: row.categoryId,
	monthItemId: row.monthItemId,
	monthItem: row.monthItem
		? {
				id: row.monthItem.id,
				month: row.monthItem.month,
				name: row.monthItem.name,
			}
		: null,
	archived: row.archived,
	createdAt: row.createdAt.toISOString(),
	totals: totalsOf(items),
});

export class ShoppingService {
	constructor(
		private readonly repository: ShoppingRepository,
		private readonly deps: ShoppingDeps,
	) {}

	async list(
		userId: string,
		options: { includeArchived: boolean },
	): Promise<ShoppingListSummary[]> {
		const lists = await this.repository.lists(userId, options);
		const items = (
			await this.repository.items(
				userId,
				lists.map((l) => l.id),
			)
		).map((row) => ({ listId: row.listId, item: toItem(row) }));
		return lists.map((l) =>
			toSummary(
				l,
				items.filter((i) => i.listId === l.id).map((i) => i.item),
			),
		);
	}

	async get(userId: string, id: string): Promise<ShoppingList> {
		const row = await this.findList(userId, id);
		const items = (await this.repository.items(userId, [id])).map(toItem);
		return { ...toSummary(row, items), items };
	}

	async create(
		userId: string,
		input: CreateShoppingListInput,
	): Promise<ShoppingList> {
		await this.assertLinks(userId, input);
		const row = await this.repository.insertList({
			userId,
			name: input.name,
			accountId: input.accountId ?? null,
			categoryId: input.categoryId ?? null,
			monthItemId: input.monthItemId ?? null,
		});
		return this.get(userId, row.id);
	}

	async update(
		userId: string,
		id: string,
		input: UpdateShoppingListInput,
	): Promise<ShoppingList> {
		await this.findList(userId, id);
		await this.assertLinks(userId, input);
		await this.repository.updateList(userId, id, input);
		return this.get(userId, id);
	}

	async remove(userId: string, id: string) {
		await this.findList(userId, id);
		await this.repository.deleteList(userId, id);
	}

	async addItem(
		userId: string,
		listId: string,
		input: AddShoppingItemInput,
	): Promise<ShoppingList> {
		const list = await this.findList(userId, listId);
		if (list.archived)
			throw conflict("LIST_ARCHIVED", "Esta lista está arquivada");
		await this.repository.insertItem({
			userId,
			listId,
			name: input.name,
			quantity: input.quantity ?? 1,
			unitPrice: input.unitPrice ?? null,
			position: await this.repository.nextPosition(listId),
		});
		return this.get(userId, listId);
	}

	async updateItem(
		userId: string,
		listId: string,
		itemId: string,
		input: UpdateShoppingItemInput,
	): Promise<ShoppingList> {
		await this.findItem(userId, listId, itemId);
		await this.repository.updateItem(userId, listId, itemId, input);
		return this.get(userId, listId);
	}

	async removeItem(
		userId: string,
		listId: string,
		itemId: string,
	): Promise<ShoppingList> {
		await this.findItem(userId, listId, itemId);
		await this.repository.deleteItem(userId, listId, itemId);
		return this.get(userId, listId);
	}

	async buy(
		userId: string,
		listId: string,
		itemId: string,
		input: BuyShoppingItemInput,
	): Promise<ShoppingList> {
		const list = await this.findList(userId, listId);
		const item = await this.findItem(userId, listId, itemId);
		if (item.transactionId)
			throw conflict("ALREADY_BOUGHT", "Este item já está comprado");
		const accountId = input.accountId ?? list.accountId;
		if (!accountId)
			throw unprocessable("ACCOUNT_REQUIRED", "Escolha a conta que pagou");
		const quantity =
			item.quantity === 1
				? ""
				: ` × ${String(item.quantity).replace(".", ",")}`;
		const tx = await this.deps.transactions.create(userId, {
			type: "expense",
			accountId,
			categoryId: list.categoryId ?? list.monthItem?.categoryId ?? null,
			amount: input.amount,
			occurredAt: input.occurredAt ?? new Date(),
			note: `${item.name}${quantity} · ${list.name}`,
			monthItemId: list.monthItemId,
		});
		await this.repository.updateItem(userId, listId, itemId, {
			transactionId: tx.id,
		});
		return this.get(userId, listId);
	}

	async unbuy(
		userId: string,
		listId: string,
		itemId: string,
	): Promise<ShoppingList> {
		const item = await this.findItem(userId, listId, itemId);
		if (!item.transactionId)
			throw conflict("NOT_BOUGHT", "Este item ainda não foi comprado");
		await this.repository.updateItem(userId, listId, itemId, {
			transactionId: null,
		});
		await this.deps.transactions.remove(userId, item.transactionId);
		return this.get(userId, listId);
	}

	private async assertLinks(
		userId: string,
		input: {
			accountId?: string | null;
			categoryId?: string | null;
			monthItemId?: string | null;
		},
	) {
		if (input.accountId)
			await this.deps.accounts.assertOwned(userId, [input.accountId]);
		if (input.categoryId)
			await this.deps.categories.assertOwned(userId, [input.categoryId]);
		if (input.monthItemId)
			await this.deps.budgets.assertMonthItemOwned(userId, input.monthItemId);
	}

	private async findList(userId: string, id: string) {
		const [row] = await this.repository.lists(userId, { id });
		if (!row) throw notFound("Lista de compras");
		return row;
	}

	private async findItem(userId: string, listId: string, id: string) {
		const row = await this.repository.findItem(userId, listId, id);
		if (!row) throw notFound("Item da lista");
		return row;
	}
}
