function pgCode(error: unknown): string | undefined {
	let current: unknown = error;
	for (let depth = 0; current && depth < 3; depth++) {
		const code = (current as { code?: unknown }).code;
		if (typeof code === "string") return code;
		current = (current as { cause?: unknown }).cause;
	}
	return undefined;
}

export const isUniqueViolation = (error: unknown) => pgCode(error) === "23505";
export const isForeignKeyViolation = (error: unknown) => {
	const code = pgCode(error);
	return code === "23503" || code === "23001";
};
