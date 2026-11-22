import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@wallet/db";
import * as schema from "@wallet/db/schema/auth";
import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";

export type AuthConfig = {
	BETTER_AUTH_URL: string;
	BETTER_AUTH_SECRET: string;
	CORS_ORIGIN: string;
};

export function createAuth(
	env: AuthConfig,
	database: Database,
	desktopOrigins: readonly string[] = [],
) {
	return betterAuth({
		database: drizzleAdapter(database, {
			provider: "pg",
			schema,
		}),
		trustedOrigins: [env.CORS_ORIGIN, ...desktopOrigins],
		emailAndPassword: { enabled: true },
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: {
				sameSite: "none",
				secure: true,
				httpOnly: true,
			},
		},
		// bearer: the desktop app (tauri://localhost) cannot rely on cross-site cookies in WKWebView,
		// so it authenticates with an Authorization header instead.
		plugins: [bearer()],
	});
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];

export type Auth = ReturnType<typeof createAuth>;
