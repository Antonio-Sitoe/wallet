import type { Database } from "@wallet/db";

import { AccountsController } from "./accounts.controller";
import { AccountsRepository } from "./accounts.repository";
import { accountsRoutes } from "./accounts.routes";
import { AccountsService } from "./accounts.service";
import type { AccountActivityPort } from "./accounts.types";

export { AccountsService } from "./accounts.service";
export type { AccountActivityPort } from "./accounts.types";

export function createAccountsModule(
	db: Database,
	deps: { activity: AccountActivityPort },
) {
	const repository = new AccountsRepository(db);
	const service = new AccountsService(repository, deps.activity);
	const controller = new AccountsController(service);
	return { service, routes: accountsRoutes(controller) };
}
