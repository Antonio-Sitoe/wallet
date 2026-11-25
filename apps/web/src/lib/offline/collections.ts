import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import { persistedCollectionOptions } from "@tanstack/tauri-db-sqlite-persistence";
import type {
	Account,
	Category,
	Transaction,
	TransactionPage,
	TransactionTemplate,
} from "@wallet/shared";
import { TEMPLATES_KEY } from "@/actions/settings/keys";
import { api } from "@/lib/api";
import { openPersistence, type Persistence } from "@/lib/offline/persistence";
import { setOfflineCollections, setOfflineWrites } from "@/lib/offline/registry";
import { windowStart } from "@/lib/offline/transaction-window";
import { createOfflineWrites, type OfflineWrites } from "@/lib/offline/writes";
import { queryClient } from "@/lib/query-client";

export type Ordered<T> = T & { serverOrder: number };

const withOrder = <T>(rows: T[]): Ordered<T>[] =>
	rows.map((row, serverOrder) => ({ ...row, serverOrder }));

export const TRANSACTIONS_WINDOW_KEY = ["transactions", "window"] as const;

async function fetchTransactionWindow() {
	const from = windowStart().toISOString();
	const rows: Transaction[] = [];
	let cursor: string | undefined;
	do {
		const page = await api<TransactionPage>("/transactions", {
			query: { from, limit: 200, cursor },
		});
		rows.push(...page.items);
		cursor = page.nextCursor ?? undefined;
	} while (cursor);
	return rows;
}

function createCollections(persistence: Persistence) {
	return {
		accounts: createCollection(
			persistedCollectionOptions({
				...queryCollectionOptions({
					id: "accounts",
					queryKey: ["accounts", { includeArchived: true }],
					queryFn: async () =>
						withOrder(
							await api<Account[]>("/accounts", {
								query: { includeArchived: true },
							}),
						),
					queryClient,
					getKey: (account: Ordered<Account>) => account.id,
				}),
				persistence,
				schemaVersion: 1,
				initialRender: { strategy: "network-first" },
			}),
		),
		categories: createCollection(
			persistedCollectionOptions({
				...queryCollectionOptions({
					id: "categories",
					queryKey: ["categories"],
					queryFn: async () => withOrder(await api<Category[]>("/categories")),
					queryClient,
					getKey: (category: Ordered<Category>) => category.id,
				}),
				persistence,
				schemaVersion: 1,
				initialRender: { strategy: "network-first" },
			}),
		),
		templates: createCollection(
			persistedCollectionOptions({
				...queryCollectionOptions({
					id: "templates",
					queryKey: [...TEMPLATES_KEY],
					queryFn: async () =>
						withOrder(
							await api<TransactionTemplate[]>("/settings/templates"),
						),
					queryClient,
					getKey: (template: Ordered<TransactionTemplate>) => template.id,
				}),
				persistence,
				schemaVersion: 1,
				initialRender: { strategy: "network-first" },
			}),
		),
		transactions: createCollection(
			persistedCollectionOptions({
				...queryCollectionOptions({
					id: "transactions",
					queryKey: [...TRANSACTIONS_WINDOW_KEY],
					queryFn: fetchTransactionWindow,
					queryClient,
					getKey: (transaction: Transaction) => transaction.id,
				}),
				persistence,
				schemaVersion: 1,
				initialRender: { strategy: "network-first" },
			}),
		),
	};
}

export type OfflineCollections = ReturnType<typeof createCollections>;

type Opened = {
	userId: string;
	collections: OfflineCollections;
	writes: OfflineWrites;
	close: () => Promise<unknown>;
};

let opened: Opened | null = null;
let opening: Promise<Opened> | null = null;

async function open(userId: string): Promise<Opened> {
	const { database, persistence } = await openPersistence(userId);
	const collections = createCollections(persistence);
	const writes = createOfflineWrites(userId, collections.transactions);
	await writes.ready();
	return {
		userId,
		collections,
		writes,
		close: () => database.close(),
	};
}

export async function initOfflineCollections(userId: string) {
	if (opened?.userId === userId) return opened.collections;
	if (opened) await resetOfflineCollections();
	opening ??= open(userId).then((result) => {
		opened = result;
		opening = null;
		setOfflineCollections(result.collections);
		setOfflineWrites(result.writes);
		return result;
	});
	return (await opening).collections;
}

export async function resetOfflineCollections() {
	const current = opened;
	opened = null;
	setOfflineCollections(null);
	setOfflineWrites(null);
	if (!current) return;
	current.writes.dispose();
	await Promise.all(
		Object.values(current.collections).map((collection) =>
			collection.cleanup(),
		),
	);
	await current.close().catch(() => undefined);
}
