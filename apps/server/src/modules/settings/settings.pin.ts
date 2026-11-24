import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt) as (
	password: string,
	salt: Buffer,
	length: number,
) => Promise<Buffer>;

const KEY_LENGTH = 32;
const LOCK_BASE_MS = 5 * 60_000;
const LOCK_MAX_MS = 60 * 60_000;

export async function hashPin(pin: string) {
	const salt = randomBytes(16);
	const key = await derive(pin, salt, KEY_LENGTH);
	return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function pinMatches(pin: string, stored: string) {
	const [scheme, salt, key] = stored.split("$");
	if (scheme !== "scrypt" || !salt || !key) return false;
	const expected = Buffer.from(key, "base64");
	const actual = await derive(
		pin,
		Buffer.from(salt, "base64"),
		expected.length,
	);
	return timingSafeEqual(actual, expected);
}

export function lockDuration(failedAttempts: number, maxAttempts: number) {
	const locks = Math.floor(failedAttempts / maxAttempts);
	if (locks === 0) return 0;
	return Math.min(LOCK_BASE_MS * 2 ** (locks - 1), LOCK_MAX_MS);
}
