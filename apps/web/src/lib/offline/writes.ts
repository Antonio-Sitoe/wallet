import {
	IndexedDBAdapter,
	NonRetriableError,
	type OfflineConfig,
	startOfflineExecutor,
} from "@tanstack/offline-transactions";
import {
	type CreateTransactionInput,
	type CreateTransferInput,
	type Transaction,
	type Transfer,
	type UpdateTransactionInput,
	type UpdateTransferInput,
	yearMonthOf,
} from "@wallet/shared";
import { toast } from "sonner";
import type { Wire } from "@/@types/wire";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { ApiError, api, errorMessage } from "@/lib/api";
import {
	isOnline,
	reportOnline,
	subscribeConnection,
} from "@/lib/connection";
import type { OfflineCollections } from "@/lib/offline/collections";
import { transferOf } from "@/lib/offline/transaction-window";
import { queryClient } from "@/lib/query-client";

export type CreateTransactionBody = Wire<Partial<CreateTransactionInput>> &
	Pick<CreateTransactionInput, "type" | "accountId" | "amount">;
export type UpdateTransactionBody = Wire<UpdateTransactionInput> & {
	id: string;
};
export type CreateTransferBody = Wire<
	Omit<CreateTransferInput, "referenceMonth">
> & { referenceMonth?: string };
export type UpdateTransferBody = Wire<UpdateTransferInput> & { id: string };

type Transactions = OfflineCollections["transactions"];
type Params = Parameters<OfflineConfig["mutationFns"][string]>[0];

const RETRYABLE = new Set([401, 408, 425, 429]);

type Mutation = {
	type: string;
	modified?: Partial<Transaction>;
	original?: Partial<Transaction>;
};

export type PendingState = { count: number; deltas: Map<string, number> };

function addDelta(
	deltas: Map<string, number>,
	row: Partial<Transaction> | undefined,
	sign: 1 | -1,
) {
	if (!row?.accountId || typeof row.amount !== "number") return;
	deltas.set(
		row.accountId,
		(deltas.get(row.accountId) ?? 0) + sign * row.amount,
	);
}

function deltasOf(mutations: Mutation[]) {
	const deltas = new Map<string, number>();
	for (const mutation of mutations) {
		if (mutation.type !== "insert") addDelta(deltas, mutation.original, -1);
		if (mutation.type !== "delete") addDelta(deltas, mutation.modified, 1);
	}
	return deltas;
}

async function send<T>(request: () => Promise<T>) {
	try {
		return await request();
	} catch (error) {
		if (
			error instanceof ApiError &&
			error.status < 500 &&
			!RETRYABLE.has(error.status)
		)
			throw new NonRetriableError(error.message);
		throw error;
	}
}

const signed = (type: Transaction["type"], amount: number) =>
	type === "expense" ? -Math.abs(amount) : Math.abs(amount);

const monthOf = (iso: string) => yearMonthOf(new Date(iso));

function nextReferenceMonth(
	current: Pick<Transaction, "referenceMonth" | "occurredAt">,
	occurredAt: string | undefined,
	explicit: string | undefined,
) {
	if (explicit) return explicit;
	if (occurredAt && current.referenceMonth === monthOf(current.occurredAt))
		return monthOf(occurredAt);
	return current.referenceMonth;
}

function defined<T extends object>(patch: T) {
	return Object.fromEntries(
		Object.entries(patch).filter(([, value]) => value !== undefined),
	) as Partial<T>;
}

export function createOfflineWrites(
	userId: string,
	transactions: Transactions,
) {
	const legsOf = (transferId: string) =>
		Array.from(transactions.values()).filter(
			(tx) => tx.transferId === transferId,
		);

	async function saveLegs(transfer: Transfer) {
		const legs = await Promise.all([
			api<Transaction>(`/transactions/${transfer.legs.outId}`),
			api<Transaction>(`/transactions/${transfer.legs.inId}`),
		]);
		await transactions.utils.writeUpsert(legs);
	}

	async function forget(keys: string[]) {
		for (const key of keys) {
			try {
				await transactions.utils.writeDelete(key);
			} catch {}
		}
	}

	const synced = <T>(work: (params: Params) => Promise<T>) =>
		async (params: Params) => {
			await work(params);
			await queryClient.refetchQueries({ queryKey: ["accounts"] });
			refreshMoney(queryClient);
		};

	const pending = new Map<string, Map<string, number>>();
	const pendingListeners = new Set<() => void>();
	let pendingState: PendingState = { count: 0, deltas: new Map() };

	function publishPending() {
		const deltas = new Map<string, number>();
		for (const entry of pending.values())
			for (const [accountId, amount] of entry)
				deltas.set(accountId, (deltas.get(accountId) ?? 0) + amount);
		pendingState = { count: pending.size, deltas };
		for (const listener of pendingListeners) listener();
	}

	function track(id: string, mutations: Mutation[], settled: Promise<unknown>) {
		pending.set(id, deltasOf(mutations));
		publishPending();
		void settled
			.catch(() => undefined)
			.then(() => {
				pending.delete(id);
				publishPending();
			});
	}

	const executor = startOfflineExecutor({
		collections: { transactions },
		storage: new IndexedDBAdapter(`wallet-outbox-${userId}`, "transactions"),
		onlineDetector: {
			subscribe: (callback) =>
				subscribeConnection(() => {
					if (isOnline()) callback();
				}),
			notifyOnline: reportOnline,
			isOnline,
			dispose: () => undefined,
		},
		mutationFns: {
			createTransaction: synced(async ({ transaction }) => {
				const row = await send(() =>
					api<Transaction>("/transactions", {
						method: "POST",
						body: transaction.metadata.body,
					}),
				);
				await transactions.utils.writeUpsert(row);
			}),
			updateTransaction: synced(async ({ transaction }) => {
				const { id, ...body } = transaction.metadata
					.body as UpdateTransactionBody;
				const row = await send(() =>
					api<Transaction>(`/transactions/${id}`, { method: "PATCH", body }),
				);
				await transactions.utils.writeUpsert(row);
			}),
			deleteTransaction: synced(async ({ transaction }) => {
				await send(() =>
					api<void>(`/transactions/${transaction.metadata.id}`, {
						method: "DELETE",
					}),
				);
				await forget(transaction.mutations.map((m: { key: unknown }) => String(m.key)));
			}),
			createTransfer: synced(async ({ transaction }) => {
				const transfer = await send(() =>
					api<Transfer>("/transfers", {
						method: "POST",
						body: transaction.metadata.body,
					}),
				);
				await saveLegs(transfer);
			}),
			updateTransfer: synced(async ({ transaction }) => {
				const { id, ...body } = transaction.metadata
					.body as UpdateTransferBody;
				const transfer = await send(() =>
					api<Transfer>(`/transfers/${id}`, { method: "PATCH", body }),
				);
				await saveLegs(transfer);
			}),
			deleteTransfer: synced(async ({ transaction }) => {
				await send(() =>
					api<void>(`/transfers/${transaction.metadata.id}`, {
						method: "DELETE",
					}),
				);
				await forget(transaction.mutations.map((m: { key: unknown }) => String(m.key)));
			}),
		},
	});

	function run(
		mutationFnName: string,
		metadata: Record<string, unknown>,
		apply: () => void,
	) {
		const offline = executor.createOfflineTransaction({
			mutationFnName,
			metadata,
		});
		const transaction = offline.mutate(apply);
		const settled = transaction.when("settled");
		settled.catch((error: unknown) => toast.error(errorMessage(error)));
		track(transaction.id, transaction.mutations as Mutation[], settled);
	}

	async function online<T>(request: () => Promise<T>) {
		const result = await request();
		refreshMoney(queryClient);
		return result;
	}

	return {
		async ready() {
			await executor.waitForInit();
			for (const restored of await executor.peekOutbox())
				track(
					restored.id,
					restored.mutations as Mutation[],
					executor.waitForTransactionCompletion(restored.id),
				);
		},
		subscribePending(listener: () => void) {
			pendingListeners.add(listener);
			return () => {
				pendingListeners.delete(listener);
			};
		},
		pendingState: () => pendingState,
		dispose: () => executor.dispose(),

		createTransaction(input: CreateTransactionBody) {
			const now = new Date().toISOString();
			const body = { ...input, id: input.id ?? crypto.randomUUID() };
			const occurredAt = body.occurredAt ?? now;
			const row: Transaction = {
				id: body.id,
				type: body.type,
				accountId: body.accountId,
				categoryId: body.categoryId ?? null,
				amount: signed(body.type, body.amount),
				occurredAt,
				referenceMonth: body.referenceMonth ?? monthOf(occurredAt),
				note: body.note ?? null,
				payee: body.payee ?? null,
				labels: body.labels ?? [],
				transferId: null,
				counterpartAccountId: null,
				importBatchId: null,
				monthItemId: body.monthItemId ?? null,
				createdAt: now,
			};
			run("createTransaction", { body }, () => transactions.insert(row));
			return Promise.resolve(row);
		},

		updateTransaction(input: UpdateTransactionBody) {
			const current = transactions.get(input.id);
			if (!current)
				return online(() => {
					const { id, ...body } = input;
					return api<Transaction>(`/transactions/${id}`, {
						method: "PATCH",
						body,
					});
				});
			const type = input.type ?? (current.type as "expense" | "income");
			const amount = input.amount ?? Math.abs(current.amount);
			const patch = defined({
				accountId: input.accountId,
				categoryId: input.categoryId,
				type,
				amount: signed(type, amount),
				occurredAt: input.occurredAt,
				referenceMonth: nextReferenceMonth(
					current,
					input.occurredAt,
					input.referenceMonth,
				),
				note: input.note,
				payee: input.payee,
				labels: input.labels,
				monthItemId: input.monthItemId,
			});
			run("updateTransaction", { body: input }, () =>
				transactions.update(input.id, (draft) => {
					Object.assign(draft, patch);
				}),
			);
			return Promise.resolve({ ...current, ...patch } as Transaction);
		},

		deleteTransaction(id: string) {
			const current = transactions.get(id);
			if (!current)
				return online(() =>
					api<void>(`/transactions/${id}`, { method: "DELETE" }),
				);
			const keys = current.transferId
				? legsOf(current.transferId).map((leg) => leg.id)
				: [id];
			run("deleteTransaction", { id }, () => transactions.delete(keys));
			return Promise.resolve();
		},

		createTransfer(input: CreateTransferBody) {
			const now = new Date().toISOString();
			const body = { ...input, id: input.id ?? crypto.randomUUID() };
			const occurredAt = body.occurredAt;
			const leg = {
				type: "transfer" as const,
				categoryId: null,
				occurredAt,
				referenceMonth: body.referenceMonth ?? monthOf(occurredAt),
				note: body.note ?? null,
				payee: null,
				labels: [],
				transferId: body.id,
				importBatchId: null,
				createdAt: now,
			};
			const out: Transaction = {
				...leg,
				id: crypto.randomUUID(),
				accountId: body.fromAccountId,
				counterpartAccountId: body.toAccountId,
				amount: -body.amount,
				monthItemId: body.monthItemId ?? null,
			};
			const into: Transaction = {
				...leg,
				id: crypto.randomUUID(),
				accountId: body.toAccountId,
				counterpartAccountId: body.fromAccountId,
				amount: body.amount,
				monthItemId: null,
			};
			run("createTransfer", { body }, () => transactions.insert([out, into]));
			return Promise.resolve(transferOf(body.id, [out, into]) as Transfer);
		},

		updateTransfer(input: UpdateTransferBody) {
			const legs = legsOf(input.id);
			const out = legs.find((leg) => leg.amount < 0);
			const into = legs.find((leg) => leg.amount >= 0);
			if (!out || !into)
				return online(() => {
					const { id, ...body } = input;
					return api<Transfer>(`/transfers/${id}`, { method: "PATCH", body });
				});
			const from = input.fromAccountId ?? out.accountId;
			const to = input.toAccountId ?? into.accountId;
			const amount = input.amount ?? into.amount;
			const shared = defined({
				occurredAt: input.occurredAt,
				referenceMonth: nextReferenceMonth(
					out,
					input.occurredAt,
					input.referenceMonth,
				),
				note: input.note,
			});
			const outPatch = defined({
				...shared,
				accountId: from,
				counterpartAccountId: to,
				amount: -amount,
				monthItemId: input.monthItemId,
			});
			const inPatch = {
				...shared,
				accountId: to,
				counterpartAccountId: from,
				amount,
			};
			run("updateTransfer", { body: input }, () => {
				transactions.update(out.id, (draft) => {
					Object.assign(draft, outPatch);
				});
				transactions.update(into.id, (draft) => {
					Object.assign(draft, inPatch);
				});
			});
			return Promise.resolve(
				transferOf(input.id, [
					{ ...out, ...outPatch },
					{ ...into, ...inPatch },
				]) as Transfer,
			);
		},

		deleteTransfer(id: string) {
			const keys = legsOf(id).map((leg) => leg.id);
			if (!keys.length)
				return online(() => api<void>(`/transfers/${id}`, { method: "DELETE" }));
			run("deleteTransfer", { id }, () => transactions.delete(keys));
			return Promise.resolve();
		},
	};
}

export type OfflineWrites = ReturnType<typeof createOfflineWrites>;
