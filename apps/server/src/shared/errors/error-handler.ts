import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

import { AppError } from "./app-error";

export function errorHandler(
	error: FastifyError | AppError,
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (error instanceof AppError) {
		return reply.status(error.statusCode).send({
			error: {
				code: error.code,
				message: error.message,
				details: error.details,
			},
		});
	}
	if (error.statusCode && error.statusCode < 500) {
		return reply.status(error.statusCode).send({
			error: { code: error.code ?? "BAD_REQUEST", message: error.message },
		});
	}
	request.log.error({ err: error }, "Unhandled error");
	return reply
		.status(500)
		.send({ error: { code: "INTERNAL_ERROR", message: "Erro interno" } });
}
