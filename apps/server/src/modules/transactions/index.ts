import type { Database } from "@wallet/db";

import { transactionsRoutes } from "./routes";
import { createTransactionsService, type TransactionsDeps } from "./service";

export type {
	ImportedTransaction,
	ImportedTransfer,
	TransactionsDeps,
	TransactionsService,
} from "./service";

/** Transactions and transfers: CRUD, filtered keyset listing, import writes. Owns `transactions` and `transfers`. */
export function createTransactionsModule(db: Database, deps: TransactionsDeps) {
	const service = createTransactionsService(db, deps);
	return { service, routes: transactionsRoutes(service) };
}
