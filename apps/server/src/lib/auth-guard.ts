import type { Session } from "@wallet/auth";
import type { FastifyReply, FastifyRequest } from "fastify";

import { unauthorized } from "./errors";

declare module "fastify" {
	interface FastifyRequest {
		/** Set by the auth guard on every /api route; every query is scoped by it. */
		userId: string;
	}
}

type SessionLookup = (headers: Headers) => Promise<Session | null>;

export function toHeaders(raw: FastifyRequest["headers"]): Headers {
	const headers = new Headers();
	for (const [key, value] of Object.entries(raw)) {
		if (value === undefined) continue;
		headers.append(key, Array.isArray(value) ? value.join(", ") : value);
	}
	return headers;
}

export function createAuthGuard(getSession: SessionLookup) {
	return async function authGuard(
		request: FastifyRequest,
		_reply: FastifyReply,
	) {
		const session = await getSession(toHeaders(request.headers));
		if (!session) throw unauthorized();
		request.userId = session.user.id;
	};
}
