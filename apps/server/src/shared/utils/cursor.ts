import { AppError } from "../errors/app-error";

export type Cursor = { occurredAt: Date; id: string };

export function encodeCursor(cursor: Cursor): string {
	return Buffer.from(
		`${cursor.occurredAt.toISOString()}|${cursor.id}`,
	).toString("base64url");
}

export function decodeCursor(value: string): Cursor {
	const [iso, id] = Buffer.from(value, "base64url").toString("utf8").split("|");
	const occurredAt = new Date(iso ?? "");
	if (!id || Number.isNaN(occurredAt.getTime())) {
		throw new AppError(400, "INVALID_CURSOR", "Cursor inválido");
	}
	return { occurredAt, id };
}
