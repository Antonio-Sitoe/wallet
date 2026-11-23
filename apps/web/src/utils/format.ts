import {
	addMonths,
	formatMZN,
	MONTH_NAMES_PT,
	parseYearMonth,
	toCents,
	yearMonthOf,
} from "@wallet/shared";

export { addMonths, yearMonthOf };

export const money = (cents: number) => formatMZN(cents);

export const signedMoney = (cents: number) =>
	cents > 0 ? `+${formatMZN(cents)}` : formatMZN(cents);

export function parseMoney(text: string): number | null {
	if (text.trim() === "") return null;
	try {
		return toCents(text);
	} catch {
		return null;
	}
}

export const moneyInput = (cents: number | null | undefined) =>
	cents == null ? "" : (cents / 100).toString().replace(".", ",");

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function monthLabel(month: string) {
	const { year, month: m } = parseYearMonth(month);
	return `${capitalize(MONTH_NAMES_PT[m - 1]!)} ${year}`;
}

export function shortMonth(month: string) {
	const { year, month: m } = parseYearMonth(month);
	return `${MONTH_NAMES_PT[m - 1]!.slice(0, 3)} ${String(year).slice(2)}`;
}

export const MONTH_INITIALS = [
	"J",
	"F",
	"M",
	"A",
	"M",
	"J",
	"J",
	"A",
	"S",
	"O",
	"N",
	"D",
];
export const MONTH_SHORT = MONTH_NAMES_PT.map((m) => m.slice(0, 3));

export const currentMonth = () => yearMonthOf(new Date());

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function dayKey(iso: string) {
	const local = new Date(new Date(iso).getTime() + 2 * 3600_000);
	return local.toISOString().slice(0, 10);
}

export function dayLabel(key: string) {
	const d = new Date(`${key}T12:00:00Z`);
	return `${WEEKDAYS[d.getUTCDay()]} · ${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]}`;
}

export function todayInput() {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const dateInputOf = (iso: string) => dayKey(iso);

export function instantOf(dateInput: string) {
	if (dateInput === todayInput()) return new Date().toISOString();
	return new Date(`${dateInput}T12:00:00`).toISOString();
}

export const ACCOUNT_TYPE_LABEL = {
	bank: "Banco",
	mobile_wallet: "Carteira móvel",
	cash: "Dinheiro",
	savings: "Poupança",
} as const;

export const GROUP_LABEL = {
	fixed: "Fixos",
	savings: "Poupança e metas",
	variable: "Variáveis",
	oneoff: "Pontuais e não planeados",
} as const;

export const STATUS_LABEL = {
	unpaid: "por pagar",
	partial: "parcial",
	paid: "pago",
	over: "acima",
} as const;

export function compact(cents: number) {
	const mzn = cents / 100;
	const abs = Math.abs(mzn);
	if (abs >= 1_000_000)
		return `${(mzn / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
	if (abs >= 10_000) return `${Math.round(mzn / 1_000)}k`;
	if (abs >= 1_000)
		return `${(mzn / 1_000).toFixed(1).replace(".0", "").replace(".", ",")}k`;
	return String(Math.round(mzn));
}
