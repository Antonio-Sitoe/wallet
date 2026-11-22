import type { Database } from "@wallet/db";

import { accountsRoutes } from "./routes";
import { type AccountActivityPort, createAccountsService } from "./service";

export type { AccountActivityPort, AccountsService } from "./service";

/** Accounts: CRUD, computed balances, reconcile. Owns the `accounts` table. */
export function createAccountsModule(
	db: Database,
	deps: { activity: AccountActivityPort },
) {
	const service = createAccountsService(db, deps.activity);
	return { service, routes: accountsRoutes(service) };
}
