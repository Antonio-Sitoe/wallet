import { type Cents, toCents } from "./money";

export type ShoppingLine = {
	name: string;
	quantity: number;
	unitPrice: Cents | null;
};

const NUMBER = /^\d+(?:[.,]\d+)?$/;
const TIMES = /^(?:[x×](\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)[x×])$/i;

const toNumber = (text: string) => Number(text.replace(",", "."));

export function parseShoppingLine(text: string): ShoppingLine | null {
	const tokens = text.trim().split(/\s+/).filter(Boolean);
	let quantity: number | null = null;
	let unitPrice: Cents | null = null;

	const rest = tokens.filter((token) => {
		const times = TIMES.exec(token);
		if (times && quantity === null) {
			quantity = toNumber(times[1] ?? times[2] ?? "1");
			return false;
		}
		return true;
	});

	if (rest.length > 1 && NUMBER.test(rest[0] ?? "") && quantity === null) {
		quantity = toNumber(rest.shift() ?? "1");
	}
	if (rest.length > 1 && NUMBER.test(rest.at(-1) ?? "")) {
		unitPrice = toCents(rest.pop() ?? "0");
	}

	const name = rest.join(" ");
	if (!name) return null;
	const finalQuantity: number = quantity ?? 1;
	return {
		name,
		quantity: finalQuantity > 0 ? finalQuantity : 1,
		unitPrice: unitPrice === 0 ? null : unitPrice,
	};
}
