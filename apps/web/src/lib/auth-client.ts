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

const DESKTOP_TOKEN_KEY = "wallet.auth-token";

export function readDesktopToken() {
	try {
		return localStorage.getItem(DESKTOP_TOKEN_KEY) ?? "";
	} catch {
		return "";
	}
}

export function clearDesktopToken() {
	try {
		localStorage.removeItem(DESKTOP_TOKEN_KEY);
	} catch {}
}

export const authClient = createAuthClient({
	baseURL: new URL("/api/auth", getServerUrl(ENV.VITE_SERVER_URL)).toString(),
	fetchOptions: isDesktop
		? {
				auth: { type: "Bearer", token: readDesktopToken },
				onSuccess: (ctx) => {
					const token = ctx.response.headers.get("set-auth-token");
					if (token) {
						try {
							localStorage.setItem(DESKTOP_TOKEN_KEY, token);
						} catch {}
					}
				},
			}
		: undefined,
});
