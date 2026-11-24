import { drizzle } from "drizzle-orm/node-postgres";

import type { DatabaseConfig } from "./config";
import { relations } from "./relations";

export function createDb(env: DatabaseConfig) {
	return drizzle(env.DATABASE_URL, { relations });
}

export type Database = ReturnType<typeof createDb>;
export type DbTransaction = Parameters<
	Parameters<Database["transaction"]>[0]
>[0];
/** Anything queries can run on: the pool or an open transaction. Lets modules join a caller's transaction. */
export type DbExecutor = Database | DbTransaction;
