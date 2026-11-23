/**
 * The "Calculo Financeiro" spreadsheet → monthly budget lists. Pure: no database.
 *
 * The "Gastos com salario" sheet holds one block per month: a month name in column A, then item/value pairs
 * in B/C, B/D or D/E. Names that come back in three or more months become yearly plan items; the rest are
 * one-off ("não planeado") items of their month.
 */

import { MONTH_NAMES_PT, parseMonthName, toCents } from "@wallet/shared";
import { unzipSync } from "fflate";

export type Cell = { value: string; formula?: string };
export type Sheet = { name: string; rows: Map<number, Map<string, Cell>> };

const decode = (s: string) =>
	s
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
		.replace(/&amp;/g, "&");

const texts = (xml: string) =>
	[...xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
		.map((m) => decode(m[1] ?? ""))
		.join("");

/** Minimal .xlsx reader: shared strings, inline strings and cached formula values. */
export function readXlsx(bytes: Uint8Array): Sheet[] {
	let files: Record<string, Uint8Array>;
	try {
		files = unzipSync(bytes);
	} catch {
		throw new Error("O ficheiro não é um .xlsx válido");
	}
	const read = (path: string) =>
		files[path] ? new TextDecoder().decode(files[path]) : null;
	const shared = [
		...(read("xl/sharedStrings.xml") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g),
	].map((m) => texts(m[1] ?? ""));
	const workbook = read("xl/workbook.xml");
	const rels = read("xl/_rels/workbook.xml.rels");
	if (!workbook || !rels) throw new Error("O ficheiro não é um .xlsx válido");
	const targets = new Map(
		[...rels.matchAll(/<Relationship\b([^>]*)\/?>/g)].map((m) => {
			const attrs = m[1] ?? "";
			return [
				/Id="([^"]+)"/.exec(attrs)?.[1] ?? "",
				/Target="([^"]+)"/.exec(attrs)?.[1] ?? "",
			];
		}),
	);
	return [...workbook.matchAll(/<sheet\b([^>]*)\/>/g)].map((m) => {
		const attrs = m[1] ?? "";
		const name = decode(/name="([^"]+)"/.exec(attrs)?.[1] ?? "");
		const rid = /r:id="([^"]+)"/.exec(attrs)?.[1] ?? "";
		const target = (targets.get(rid) ?? "").replace(/^\/?(xl\/)?/, "");
		const xml = read(`xl/${target}`) ?? "";
		const rows = new Map<number, Map<string, Cell>>();
		for (const c of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
			const cAttrs = c[1] ?? "";
			const body = c[2] ?? "";
			const ref = /r="([A-Z]+)(\d+)"/.exec(cAttrs);
			if (!ref) continue;
			const type = /t="([^"]+)"/.exec(cAttrs)?.[1];
			const raw = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
			const formula = /<f[^>]*>([\s\S]*?)<\/f>/.exec(body)?.[1];
			let value = raw === undefined ? "" : decode(raw);
			if (type === "s") value = shared[Number(value)] ?? "";
			if (type === "inlineStr") value = texts(body);
			if (value === "" && !formula) continue;
			const row = Number(ref[2]);
			if (!rows.has(row)) rows.set(row, new Map());
			rows.get(row)!.set(ref[1]!, {
				value,
				formula: formula ? decode(formula) : undefined,
			});
		}
		return { name, rows };
	});
}

export type SheetItem = { name: string; amount: number; row: number };
export type SheetMonth = { month: string; label: string; items: SheetItem[] };

const isNumber = (s: string | undefined) =>
	!!s && /^-?\d+(\.\d+)?$/.test(s.trim());
const IGNORED = /^(total|gastos|itens|valor.*|m[eê]s)$/i;

/** Reads the month blocks. Months are placed in `year`; a block's own label is kept for the preview. */
export function parseSalarySheet(sheet: Sheet, year: number) {
	const months: SheetMonth[] = [];
	const skipped: { row: number; text: string }[] = [];
	let current: SheetMonth | null = null;
	for (const rowNumber of [...sheet.rows.keys()].sort((a, b) => a - b)) {
		const row = sheet.rows.get(rowNumber)!;
		const a = row.get("A")?.value.trim();
		const monthNumber = a ? parseMonthName(a) : null;
		if (monthNumber) {
			const month = `${year}-${String(monthNumber).padStart(2, "0")}`;
			current = months.find((m) => m.month === month) ?? null;
			if (!current) {
				current = { month, label: a!, items: [] };
				months.push(current);
			}
		}
		if (!current) continue;
		for (const [labelCol, valueCols] of [
			["B", ["C", "D"]],
			["D", ["E"]],
		] as const) {
			const label = row.get(labelCol)?.value.trim();
			if (
				!label ||
				isNumber(label) ||
				IGNORED.test(label) ||
				parseMonthName(label)
			)
				continue;
			const valueCol = valueCols.find((col) => isNumber(row.get(col)?.value));
			if (!valueCol) {
				skipped.push({ row: rowNumber, text: label });
				continue;
			}
			const amount = toCents(row.get(valueCol)!.value);
			if (amount > 0)
				current.items.push({ name: label, amount, row: rowNumber });
		}
	}
	// The same item twice in one month is one line split in two (e.g. Alimentação 1 737 + 963 = 2 700).
	for (const m of months) {
		const merged = new Map<string, SheetItem>();
		for (const item of m.items) {
			const key = itemKey(item.name);
			const prev = merged.get(key);
			merged.set(
				key,
				prev
					? { ...prev, amount: prev.amount + item.amount }
					: { ...item, name: item.name.trim() },
			);
		}
		m.items = [...merged.values()];
	}
	return {
		months: months
			.filter((m) => m.items.length > 0)
			.sort((x, y) => x.month.localeCompare(y.month)),
		skipped,
	};
}

const normalize = (s: string) =>
	s
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim();

/** Same thing, different spelling across months. */
const ALIASES: [RegExp, string][] = [
	[/^emergencia\b.*/, "emergencia"],
	[/^vovo$/, "vovo ester"],
	[/^claude$/, "claude code"],
	[/^moradia\b.*/, "moradia"],
	[/^alimentacao$/, "alimentacao"],
	[/^credito ?\/ ?chamadas$/, "credito/chamadas"],
];

export function itemKey(name: string) {
	const n = normalize(name);
	for (const [re, key] of ALIASES) if (re.test(n)) return key;
	return n;
}

export type ItemRule = {
	slug: string;
	group?: "fixed" | "savings" | "variable" | "oneoff";
	partial?: boolean;
	step?: number;
	/** Savings: the account the money goes to. */
	toAccount?: string;
};

/** Item name → category slug and budget behaviour. First match wins. */
export const RULES: [RegExp, ItemRule][] = [
	[
		/^estique/,
		{ slug: "estique", group: "savings", toAccount: "Xitique (Poupança)" },
	],
	[/^xitique/, { slug: "estique", group: "savings" }],
	[
		/^emergencia/,
		{
			slug: "investimentos.poupanca",
			group: "savings",
			toAccount: "BIM (Poupança)",
		},
	],
	[/^obra/, { slug: "obra", group: "savings", toAccount: "BIM (Poupança)" }],
	[/^moradia/, { slug: "moradia", group: "fixed" }],
	[
		/^transporte/,
		{ slug: "transporte", group: "variable", partial: true, step: 10_000 },
	],
	[
		/^alimentacao$|^openfood/,
		{ slug: "alimentacao", group: "variable", partial: true, step: 50_000 },
	],
	[/^alimentacao/, { slug: "alimentacao" }],
	[
		/escola de sarita|porta de sarita/,
		{ slug: "educacao.escola-sarita", group: "fixed" },
	],
	[/escola de ingles|explicacao/, { slug: "educacao.ingles", group: "fixed" }],
	[/^internet|star ?link/, { slug: "comunicacoes.internet", group: "fixed" }],
	[/credito|chamadas/, { slug: "comunicacoes.credito", group: "fixed" }],
	[/spotify/, { slug: "subscricoes.spotify", group: "fixed" }],
	[/claude/, { slug: "subscricoes.claude", group: "fixed" }],
	[/cursor|wallet|dominio/, { slug: "subscricoes.software" }],
	[/^vovo/, { slug: "familia.vovos", group: "fixed" }],
	[/divida/, { slug: "dividas.pagas" }],
	[/celular|iphone|oculos|auriculares|capa de/, { slug: "electronica" }],
	[/roupa|calcas|sapatilhas|adidas|camisola|biquin/, { slug: "roupa" }],
	[/comprimidos/, { slug: "saude" }],
	[/perfume|vazelina|creme/, { slug: "saude.beleza" }],
	[/moto/, { slug: "transporte.viatura" }],
	[/multa/, { slug: "financeiras.impostos" }],
	[
		/presente|festa|saida|sair|imprevist|fotografias|casamento|red label/,
		{ slug: "social" },
	],
];

export function ruleFor(name: string): ItemRule | null {
	const n = normalize(name);
	return RULES.find(([re]) => re.test(n))?.[1] ?? null;
}

export type PlannedSheetItem = {
	key: string;
	name: string;
	amount: number;
	months: number[];
	rule: ItemRule | null;
};

/** Items present in at least `minMonths` blocks become plan items; the latest block gives name and amount. */
export function recurringItems(
	months: SheetMonth[],
	minMonths = 3,
): PlannedSheetItem[] {
	const byKey = new Map<
		string,
		{ months: Set<number>; name: string; amount: number; latest: string }
	>();
	for (const m of months) {
		const monthNumber = Number(m.month.slice(5));
		for (const item of m.items) {
			const key = itemKey(item.name);
			const entry = byKey.get(key) ?? {
				months: new Set<number>(),
				name: item.name,
				amount: item.amount,
				latest: "",
			};
			entry.months.add(monthNumber);
			if (m.month >= entry.latest) {
				entry.latest = m.month;
				entry.name = item.name.trim();
				entry.amount = item.amount;
			}
			byKey.set(key, entry);
		}
	}
	return [...byKey]
		.filter(([, e]) => e.months.size >= minMonths)
		.map(([key, e]) => ({
			key,
			name: e.name,
			amount: e.amount,
			months: [...e.months].sort((a, b) => a - b),
			rule: ruleFor(e.name),
		}))
		.sort((a, b) => b.months.length - a.months.length || b.amount - a.amount);
}

export const monthLabelPt = (month: string) => {
	const name = MONTH_NAMES_PT[Number(month.slice(5)) - 1] ?? month;
	return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${month.slice(0, 4)}`;
};
