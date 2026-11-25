import { createAuthClient } from "better-auth/react";
import { ENV } from "@/env";

export const isDesktop =
	typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const LEGACY_TOKEN_KEY = "wallet.auth-token";

async function keychain<T>(command: string, args?: Record<string, unknown>) {
	const { invoke } = await import("@tauri-apps/api/core");
	return invoke<T>(command, args);
}

const readLegacyToken = () => {
	try {
		return localStorage.getItem(LEGACY_TOKEN_KEY) ?? "";
	} catch {
		return "";
	}
};

const writeLegacyToken = (token: string) => {
	try {
		if (token) localStorage.setItem(LEGACY_TOKEN_KEY, token);
		else localStorage.removeItem(LEGACY_TOKEN_KEY);
	} catch {}
};

async function loadDesktopToken() {
	try {
		const stored = await keychain<string | null>("auth_token_get");
		if (stored) return stored;
	} catch {
		return readLegacyToken();
	}
	const legacy = readLegacyToken();
	if (legacy) {
		try {
			await keychain("auth_token_set", { token: legacy });
			writeLegacyToken("");
		} catch {}
	}
	return legacy;
}

let desktopToken: Promise<string> | null = null;

export function readDesktopToken() {
	desktopToken ??= loadDesktopToken();
	return desktopToken;
}

function saveDesktopToken(token: string) {
	desktopToken = Promise.resolve(token);
	keychain("auth_token_set", { token }).then(
		() => writeLegacyToken(""),
		() => writeLegacyToken(token),
	);
}

const OFFLINE_USER_KEY = "wallet.offline-user";

export function rememberOfflineUser(userId: string) {
	try {
		localStorage.setItem(OFFLINE_USER_KEY, userId);
	} catch {}
}

export async function offlineUserId() {
	if (!isDesktop || !(await readDesktopToken())) return null;
	try {
		return localStorage.getItem(OFFLINE_USER_KEY);
	} catch {
		return null;
	}
}

export function clearDesktopToken() {
	resetSession();
	try {
		localStorage.removeItem(OFFLINE_USER_KEY);
	} catch {}
	desktopToken = Promise.resolve("");
	writeLegacyToken("");
	keychain("auth_token_delete").catch(() => undefined);
}

export const authClient = createAuthClient({
	baseURL: new URL("/api/auth", ENV.VITE_SERVER_URL).toString(),
	fetchOptions: isDesktop
		? {
				auth: { type: "Bearer", token: readDesktopToken },
				onSuccess: (ctx) => {
					const token = ctx.response.headers.get("set-auth-token");
					if (token) saveDesktopToken(token);
				},
			}
		: undefined,
});

type SessionResult = Awaited<ReturnType<typeof authClient.getSession>>;

let cachedSession: Promise<SessionResult> | null = null;

export function getSession() {
	cachedSession ??= authClient.getSession().then(
		(result) => {
			if (!result.data) cachedSession = null;
			return result;
		},
		(error: unknown) => {
			cachedSession = null;
			throw error;
		},
	);
	return cachedSession;
}

export function resetSession() {
	cachedSession = null;
}
