import { createHash } from "node:crypto";

import type { AccountType } from "@wallet/shared";
import { inferReferenceMonth, toCents, yearMonthOf } from "@wallet/shared";

export const WALLET_COLUMNS = [
	"account",
	"category",
	"currency",
	"amount",
	"ref_currency_amount",
	"type",
	"payment_type",
	"note",
	"date",
	"transfer",
	"payee",
	"labels",
] as const;

export const TRANSFER_CATEGORY = "Transfer, withdraw";
export const SAVINGS_CATEGORY = "Estique ou xitique";
export const SAVINGS_ACCOUNT = "Xitique (Poupança)";

export type WalletRow = {
	file: string;
	line: number;
	hash: string;
	account: string;
	category: string;
	currency: string;
	type: "expense" | "income";
	amount: number;
	refAmount: number | null;
	paymentType: string | null;
	note: string | null;
	payee: string | null;
	labels: string[];
	occurredAt: string;
	transfer: boolean;
};

export type ParseError = { file: string; line: number; message: string };

export function parseDelimited(
	content: string,
	delimiter = ";",
): { line: number; fields: string[] }[] {
	const text = content.replace(/^﻿/, "");
	const records: { line: number; fields: string[] }[] = [];
	let fields: string[] = [];
	let field = "";
	let quoted = false;
	let line = 1;
	let recordLine = 1;
	for (let i = 0; i < text.length; i++) {
		const c = text[i]!;
		if (quoted) {
			if (c === '"' && text[i + 1] === '"') {
				field += '"';
				i++;
			} else if (c === '"') {
				quoted = false;
			} else {
				if (c === "\n") line++;
				field += c;
			}
		} else if (c === '"' && field === "") {
			quoted = true;
		} else if (c === delimiter) {
			fields.push(field);
			field = "";
		} else if (c === "\n" || c === "\r") {
			if (c === "\r" && text[i + 1] === "\n") i++;
			fields.push(field);
			if (fields.some((f) => f !== ""))
				records.push({ line: recordLine, fields });
			fields = [];
			field = "";
			line++;
			recordLine = line;
		} else {
			field += c;
		}
	}
	fields.push(field);
	if (fields.some((f) => f !== "")) records.push({ line: recordLine, fields });
	return records;
}

const emptyToNull = (value: string | undefined) =>
	value && value.trim() !== "" ? value.trim() : null;

export function parseWalletCsv(
	file: string,
	content: string,
): { rows: WalletRow[]; errors: ParseError[] } {
	const records = parseDelimited(content);
	const [header, ...body] = records;
	const errors: ParseError[] = [];
	const expected = WALLET_COLUMNS.join(";");
	if (!header || header.fields.map((f) => f.trim()).join(";") !== expected) {
		return {
			rows: [],
			errors: [
				{
					file,
					line: 1,
					message: `Cabeçalho inesperado; esperado: ${expected}`,
				},
			],
		};
	}

	const occurrences = new Map<string, number>();
	const rows: WalletRow[] = [];
	for (const { line, fields } of body) {
		const get = (column: (typeof WALLET_COLUMNS)[number]) =>
			fields[WALLET_COLUMNS.indexOf(column)] ?? "";
		try {
			const type = get("type").trim();
			if (type !== "Expense" && type !== "Income")
				throw new Error(`tipo desconhecido "${type}"`);
			const occurredAt = new Date(get("date").trim());
			if (Number.isNaN(occurredAt.getTime()))
				throw new Error(`data inválida "${get("date")}"`);
			const amount = Math.abs(toCents(get("amount")));
			if (amount === 0) throw new Error("valor zero");
			const refRaw = get("ref_currency_amount").trim();
			const account = get("account").trim();
			const category = get("category").trim();
			if (!account) throw new Error("conta em falta");

			const identity = [
				account,
				category,
				get("currency").trim(),
				amount,
				type,
				get("date").trim(),
				get("note").trim(),
				get("payee").trim(),
				get("transfer").trim(),
			].join("\u001f");
			const n = (occurrences.get(identity) ?? 0) + 1;
			occurrences.set(identity, n);

			rows.push({
				file,
				line,
				hash: createHash("sha256")
					.update(`wallet\u001f${identity}\u001f${n}`)
					.digest("hex")
					.slice(0, 40),
				account,
				category,
				currency: get("currency").trim() || "MZN",
				type: type === "Expense" ? "expense" : "income",
				amount,
				refAmount: refRaw ? Math.abs(toCents(refRaw)) : null,
				paymentType: emptyToNull(get("payment_type")),
				note: emptyToNull(get("note")),
				payee: emptyToNull(get("payee")),
				labels: get("labels")
					.split(",")
					.map((l) => l.trim())
					.filter(Boolean),
				occurredAt: occurredAt.toISOString(),
				transfer: get("transfer").trim() === "true",
			});
		} catch (error) {
			errors.push({
				file,
				line,
				message: error instanceof Error ? error.message : String(error),
			});
		}
	}
	return { rows, errors };
}

export function guessAccountType(name: string): AccountType {
	const n = name.toLowerCase();
	if (n.includes("poupan") || n.includes("xitique")) return "savings";
	if (n.includes("numer") || n.includes("cash") || n.includes("dinheiro"))
		return "cash";
	if (/(e-?mola|m-?pesa|m-?kesh)/.test(n)) return "mobile_wallet";
	return "bank";
}

export type PlannedTransaction = {
	hash: string;
	account: string;
	category: string;
	type: "expense" | "income";
	amount: number;
	occurredAt: string;
	referenceMonth: string;
	note: string | null;
	payee: string | null;
	labels: string[];
	paymentType: string | null;
	currency: string;
	refAmount: number | null;
};

export type PlannedTransfer = {
	kind: "transfer" | "savings";
	from: string;
	to: string;
	amount: number;
	occurredAt: string;
	referenceMonth: string;
	note: string | null;
	outHash: string;
	inHash: string;
};

export type PlannedReview = PlannedTransaction & {
	reason: "unpaired_transfer" | "ambiguous_transfer";
};

export type WalletPlan = {
	transactions: PlannedTransaction[];
	transfers: PlannedTransfer[];
	review: PlannedReview[];
};

export type WalletPlanSummary = {
	files: {
		name: string;
		rows: number;
		firstDate: string | null;
		lastDate: string | null;
		new: number;
		duplicate: number;
	}[];
	totals: {
		rows: number;
		new: number;
		duplicate: number;
		transactions: number;
		transferPairs: number;
		savingsTransfers: number;
		referenceMonthFromNote: number;
		debtNotes: number;
		toReview: number;
	};
	accounts: { name: string; rows: number }[];
	categories: { walletName: string; rows: number }[];
};

function referenceFor(row: WalletRow) {
	const fromNote = row.note
		? inferReferenceMonth(row.note, new Date(row.occurredAt))
		: null;
	return {
		referenceMonth: fromNote ?? yearMonthOf(new Date(row.occurredAt)),
		fromNote: fromNote !== null,
		note: fromNote ? null : row.note,
	};
}

function toPlanned(row: WalletRow): PlannedTransaction {
	const { referenceMonth, note } = referenceFor(row);
	return {
		hash: row.hash,
		account: row.account,
		category: row.category,
		type: row.type,
		amount: row.amount,
		occurredAt: row.occurredAt,
		referenceMonth,
		note,
		payee: row.payee,
		labels: row.labels,
		paymentType: row.paymentType,
		currency: row.currency,
		refAmount: row.refAmount,
	};
}

function pairTransfers(rows: WalletRow[]) {
	const pairs: { out: WalletRow; in: WalletRow }[] = [];
	const review: PlannedReview[] = [];
	const groups = new Map<string, WalletRow[]>();
	for (const row of rows)
		groups.set(row.occurredAt, [...(groups.get(row.occurredAt) ?? []), row]);

	for (const group of groups.values()) {
		const outs = group.filter((r) => r.type === "expense");
		const ins = group.filter((r) => r.type === "income");
		const usedIn = new Set<WalletRow>();
		let pendingOuts = outs;
		for (let progress = true; progress; ) {
			progress = false;
			const stillPending: WalletRow[] = [];
			for (const out of pendingOuts) {
				const candidates = ins.filter(
					(i) =>
						!usedIn.has(i) &&
						i.amount === out.amount &&
						i.account !== out.account,
				);
				const interchangeable =
					candidates.length > 0 &&
					candidates.every((c) => c.account === candidates[0]!.account);
				if (interchangeable) {
					usedIn.add(candidates[0]!);
					pairs.push({ out, in: candidates[0]! });
					progress = true;
				} else {
					stillPending.push(out);
				}
			}
			pendingOuts = stillPending;
		}
		const leftover = [...pendingOuts, ...ins.filter((i) => !usedIn.has(i))];
		const reason =
			group.length > 2 && leftover.length > 1
				? "ambiguous_transfer"
				: "unpaired_transfer";
		for (const row of leftover) review.push({ ...toPlanned(row), reason });
	}
	return { pairs, review };
}

export function buildWalletPlan(
	files: { name: string; rows: WalletRow[] }[],
	existingHashes: ReadonlySet<string>,
): { plan: WalletPlan; summary: WalletPlanSummary } {
	const seen = new Set<string>();
	const unique: WalletRow[] = [];
	const fileStats = files.map((file) => {
		let fresh = 0;
		const dates = file.rows.map((r) => r.occurredAt).sort();
		for (const row of file.rows) {
			if (seen.has(row.hash) || existingHashes.has(row.hash)) continue;
			seen.add(row.hash);
			unique.push(row);
			fresh++;
		}
		return {
			name: file.name,
			rows: file.rows.length,
			firstDate: dates[0] ?? null,
			lastDate: dates.at(-1) ?? null,
			new: fresh,
			duplicate: file.rows.length - fresh,
		};
	});

	const transferRows = unique.filter((r) => r.transfer);
	const savingsRows = unique.filter(
		(r) =>
			!r.transfer &&
			r.category === SAVINGS_CATEGORY &&
			r.account !== SAVINGS_ACCOUNT,
	);
	const plainRows = unique.filter(
		(r) => !r.transfer && !savingsRows.includes(r),
	);

	const { pairs, review } = pairTransfers(transferRows);
	const transfers: PlannedTransfer[] = pairs.map(({ out, in: inn }) => {
		const outRef = referenceFor(out);
		const inRef = referenceFor(inn);
		const ref = outRef.fromNote ? outRef : inRef;
		return {
			kind: "transfer",
			from: out.account,
			to: inn.account,
			amount: out.amount,
			occurredAt: out.occurredAt,
			referenceMonth: ref.referenceMonth,
			note: ref.note ?? outRef.note ?? inRef.note,
			outHash: out.hash,
			inHash: inn.hash,
		};
	});
	for (const row of savingsRows) {
		const ref = referenceFor(row);
		const intoSavings = row.type === "expense";
		transfers.push({
			kind: "savings",
			from: intoSavings ? row.account : SAVINGS_ACCOUNT,
			to: intoSavings ? SAVINGS_ACCOUNT : row.account,
			amount: row.amount,
			occurredAt: row.occurredAt,
			referenceMonth: ref.referenceMonth,
			note: ref.note,
			outHash: intoSavings ? row.hash : `${row.hash}:savings`,
			inHash: intoSavings ? `${row.hash}:savings` : row.hash,
		});
	}
	const transactions = plainRows.map(toPlanned);

	const count = <K>(keys: K[]) => {
		const m = new Map<K, number>();
		for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
		return m;
	};
	const accountCounts = count(unique.map((r) => r.account));
	if (savingsRows.length > 0)
		accountCounts.set(
			SAVINGS_ACCOUNT,
			(accountCounts.get(SAVINGS_ACCOUNT) ?? 0) + savingsRows.length,
		);
	const categoryCounts = count(
		unique.filter((r) => !r.transfer).map((r) => r.category),
	);

	return {
		plan: { transactions, transfers, review },
		summary: {
			files: fileStats,
			totals: {
				rows: fileStats.reduce((s, f) => s + f.rows, 0),
				new: unique.length,
				duplicate: fileStats.reduce((s, f) => s + f.duplicate, 0),
				transactions: transactions.length + transfers.length * 2,
				transferPairs: pairs.length,
				savingsTransfers: savingsRows.length,
				referenceMonthFromNote: unique.filter((r) => referenceFor(r).fromNote)
					.length,
				debtNotes: unique.filter((r) => r.note?.includes("→")).length,
				toReview: review.length,
			},
			accounts: [...accountCounts]
				.map(([name, rows]) => ({ name, rows }))
				.sort((a, b) => b.rows - a.rows),
			categories: [...categoryCounts]
				.map(([walletName, rows]) => ({ walletName, rows }))
				.sort((a, b) => b.rows - a.rows),
		},
	};
}
