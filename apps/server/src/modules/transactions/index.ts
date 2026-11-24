import type { Database } from "@wallet/db";

import { TransactionsController } from "./transactions.controller";
import { TransactionsRepository } from "./transactions.repository";
import { transactionsRoutes } from "./transactions.routes";
import { TransactionsService } from "./transactions.service";
import type { TransactionsDeps } from "./transactions.types";

export { TransactionsService } from "./transactions.service";
export type {
	ImportedTransaction,
	ImportedTransfer,
	TransactionsDeps,
} from "./transactions.types";

export function createTransactionsModule(db: Database, deps: TransactionsDeps) {
	const repository = new TransactionsRepository(db);
	const service = new TransactionsService(repository, deps);
	const controller = new TransactionsController(service);
	return { service, routes: transactionsRoutes(controller) };
}
