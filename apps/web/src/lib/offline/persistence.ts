import {
	createTauriSQLitePersistence,
	type TauriSQLiteDatabaseLike,
} from "@tanstack/tauri-db-sqlite-persistence";

export type Persistence = ReturnType<typeof createTauriSQLitePersistence>;

async function call<T>(command: string, args: Record<string, unknown>) {
	const { invoke } = await import("@tauri-apps/api/core");
	return invoke<T>(command, args);
}

async function openDatabase(name: string) {
	await call("offline_db_open", { name });
	const database = {
		path: name,
		async execute(query: string, values: unknown[] = []) {
			const [rowsAffected, lastInsertId] = await call<[number, number]>(
				"offline_db_execute",
				{ name, query, values },
			);
			return { rowsAffected, lastInsertId };
		},
		select<T>(query: string, values: unknown[] = []) {
			return call<T>("offline_db_select", { name, query, values });
		},
		async close() {
			await call("offline_db_close", { name });
			return true;
		},
	};
	return database as TauriSQLiteDatabaseLike & { close: () => Promise<boolean> };
}

const fileOf = (userId: string) => `wallet-offline-${userId}.sqlite`;

export function deleteDatabase(userId: string) {
	return call("offline_db_delete", { name: fileOf(userId) });
}

export async function openPersistence(userId: string) {
	const database = await openDatabase(fileOf(userId));
	return { database, persistence: createTauriSQLitePersistence({ database }) };
}
