import { createTauriSQLitePersistence } from "@tanstack/tauri-db-sqlite-persistence";
import { isDesktop } from "@/lib/auth-client";

export const offlineEnabled = isDesktop;

type Persistence = ReturnType<typeof createTauriSQLitePersistence>;

let persistence: Promise<Persistence> | null = null;

export function getPersistence() {
	persistence ??= import("@tauri-apps/plugin-sql").then(async ({ default: Database }) =>
		createTauriSQLitePersistence({
			database: await Database.load("sqlite:wallet-offline.sqlite"),
		}),
	);
	return persistence;
}
