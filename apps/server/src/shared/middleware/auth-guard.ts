import type { Session } from "@wallet/auth";
import type { FastifyReply, FastifyRequest } from "fastify";

import { tooManyRequests, unauthorized } from "../errors/app-error";
import {
	type BasicVerifier,
	createFailureLimiter,
	parseBasic,
} from "./basic-auth";

declare module "fastify" {
	interface FastifyRequest {
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

export function createAuthGuard(
	getSession: SessionLookup,
	verifyBasic?: BasicVerifier,
) {
	const limiter = createFailureLimiter();
	return async function authGuard(
		request: FastifyRequest,
		_reply: FastifyReply,
	) {
		const basic = verifyBasic ? parseBasic(request.headers.authorization) : null;
		if (basic && verifyBasic) {
			const keys = [`ip:${request.ip}`, `email:${basic.email}`];
			if (limiter.blocked(keys)) throw tooManyRequests();
			const userId = await verifyBasic(basic);
			if (!userId) {
				limiter.fail(keys);
				throw unauthorized();
			}
			limiter.reset(keys);
			request.userId = userId;
			return;
		}
		const session = await getSession(toHeaders(request.headers));
		if (!session) throw unauthorized();
		request.userId = session.user.id;
	};
}
