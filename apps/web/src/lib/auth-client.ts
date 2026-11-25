import { createAuthClient } from "better-auth/react";
import { ENV } from "@/env";

function getServerUrl(url: string) {
	const processEnv = typeof process === "undefined" ? undefined : process.env;
	if (typeof window === "undefined" && processEnv?.SERVER_URL) {
		return processEnv.SERVER_URL.endsWith("/")
			? processEnv.SERVER_URL.slice(0, -1)
			: processEnv.SERVER_URL;
	}

	return url.endsWith("/") ? url.slice(0, -1) : url;
}

export const isDesktop =
	typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const LEGACY_TOKEN_KEY = "wallet.auth-token";

const keychain = async <T>(command: string, args?: Record<string, unknown>) => {
	const { invoke } = await import("@tauri-apps/api/core");
	return invoke<T>(command, args);
};

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

export function clearDesktopToken() {
	desktopToken = Promise.resolve("");
	writeLegacyToken("");
	keychain("auth_token_delete").catch(() => undefined);
}

export const authClient = createAuthClient({
	baseURL: new URL("/api/auth", getServerUrl(ENV.VITE_SERVER_URL)).toString(),
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
