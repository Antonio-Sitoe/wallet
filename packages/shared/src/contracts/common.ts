import { z } from "zod";

import { isYearMonth } from "../months";

export const id = z.uuid();

/** Integer centavos. */
export const cents = z.number().int().safe();
export const positiveCents = cents.positive();

export const yearMonth = z
	.string()
	.refine(isYearMonth, "Use o formato AAAA-MM");

export const hexColor = z
	.string()
	.regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor #RRGGBB");

/** Query strings give one value as a string and several as an array; accept both. */
export const manyIds = z.preprocess(
	(value) => (value === undefined || Array.isArray(value) ? value : [value]),
	z.array(id).max(50).optional(),
);

export const idParams = z.object({ id });
