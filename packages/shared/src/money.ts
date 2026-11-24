/**
 * Money is always stored and sent as integer centavos (1 MZN = 100 centavos).
 * Floats only appear at the edges: parsing user/CSV input and formatting for display.
 */

export type Cents = number;

/** Parses "1696.67", "1 696,67", 1696.67 → 169667. Throws on anything that is not a finite amount. */
export function toCents(value: string | number): Cents {
	const text =
		typeof value === "number"
			? String(value)
			: value.replace(/\s/g, "").replace(",", ".");
	if (!/^-?\d+(\.\d+)?$/.test(text)) {
		throw new Error(`Invalid amount: ${JSON.stringify(value)}`);
	}
	const negative = text.startsWith("-");
	const [whole = "0", fraction = ""] = text.replace("-", "").split(".");
	const fractionCents = Number((fraction + "00").slice(0, 2));
	// Round half up on the third decimal, if any.
	const roundUp = fraction.length > 2 && Number(fraction[2]) >= 5 ? 1 : 0;
	const cents = Number(whole) * 100 + fractionCents + roundUp;
	return negative ? -cents : cents;
}

export function fromCents(cents: Cents): number {
	return cents / 100;
}

/** 8443100 → "84 431", -4601358 → "−46 013,58". Thin space as thousands separator, like the design. */
export function formatMZN(
	cents: Cents,
	options: { withCurrency?: boolean } = {},
): string {
	const negative = cents < 0;
	const abs = Math.abs(cents);
	const whole = Math.floor(abs / 100)
		.toString()
		.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
	const fraction = abs % 100;
	const body =
		fraction === 0 ? whole : `${whole},${fraction.toString().padStart(2, "0")}`;
	return `${negative ? "−" : ""}${body}${options.withCurrency ? " MZN" : ""}`;
}
