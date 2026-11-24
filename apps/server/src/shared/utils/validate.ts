import type { z } from "zod";

import { AppError } from "../errors/app-error";

export function parse<T extends z.ZodType>(
	schema: T,
	data: unknown,
): z.output<T> {
	const result = schema.safeParse(data);
	if (!result.success) {
		throw new AppError(
			400,
			"VALIDATION_ERROR",
			"Dados inválidos",
			result.error.issues.map((issue) => ({
				path: issue.path.join("."),
				message: issue.message,
			})),
		);
	}
	return result.data;
}
