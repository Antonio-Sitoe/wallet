import type { Auth } from "@wallet/auth";
import type { Database } from "@wallet/db";
import { account, user } from "@wallet/db/schema/auth";
import { and, eq } from "drizzle-orm";

export type BasicCredentials = { email: string; password: string };

export type BasicVerifier = (
	credentials: BasicCredentials,
) => Promise<string | null>;

export function parseBasic(header: unknown): BasicCredentials | null {
	if (typeof header !== "string") return null;
	const [scheme, encoded] = header.trim().split(/\s+/, 2);
	if (scheme?.toLowerCase() !== "basic" || !encoded) return null;
	const decoded = Buffer.from(encoded, "base64").toString("utf8");
	const separator = decoded.indexOf(":");
	if (separator <= 0) return null;
	return {
		email: decoded.slice(0, separator).trim().toLowerCase(),
		password: decoded.slice(separator + 1),
	};
}

export function createBasicVerifier(db: Database, auth: Auth): BasicVerifier {
	return async ({ email, password }) => {
		const [row] = await db
			.select({ id: user.id, hash: account.password })
			.from(user)
			.innerJoin(
				account,
				and(eq(account.userId, user.id), eq(account.providerId, "credential")),
			)
			.where(eq(user.email, email))
			.limit(1);
		if (!row?.hash) return null;
		const context = await auth.$context;
		const valid = await context.password.verify({ hash: row.hash, password });
		return valid ? row.id : null;
	};
}

const WINDOW_MS = 60_000;
const MAX_FAILURES = 5;

export function createFailureLimiter(now = () => Date.now()) {
	const failures = new Map<string, number[]>();
	const recent = (key: string) => {
		const since = now() - WINDOW_MS;
		const list = (failures.get(key) ?? []).filter((at) => at > since);
		if (list.length) failures.set(key, list);
		else failures.delete(key);
		return list;
	};
	return {
		blocked: (keys: string[]) =>
			keys.some((key) => recent(key).length >= MAX_FAILURES),
		fail: (keys: string[]) => {
			for (const key of keys) failures.set(key, [...recent(key), now()]);
		},
		reset: (keys: string[]) => {
			for (const key of keys) failures.delete(key);
		},
	};
}
