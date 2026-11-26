export class AppError extends Error {
	constructor(
		readonly statusCode: number,
		readonly code: string,
		message: string,
		readonly details?: unknown,
	) {
		super(message);
		this.name = "AppError";
	}
}

export const notFound = (what: string) =>
	new AppError(404, "NOT_FOUND", `${what} não encontrado(a)`);

export const conflict = (code: string, message: string, details?: unknown) =>
	new AppError(409, code, message, details);

export const unprocessable = (
	code: string,
	message: string,
	details?: unknown,
) => new AppError(422, code, message, details);

export const unauthorized = () =>
	new AppError(401, "UNAUTHORIZED", "Sessão em falta ou expirada");

export const tooManyRequests = () =>
	new AppError(
		429,
		"TOO_MANY_ATTEMPTS",
		"Demasiadas tentativas falhadas. Tente outra vez daqui a um minuto.",
	);
