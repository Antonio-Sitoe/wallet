import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
	buildWalletPlan,
	guessAccountType,
	parseDelimited,
	parseWalletCsv,
} from "./imports.wallet-csv";

const HEADER =
	"account;category;currency;amount;ref_currency_amount;type;payment_type;note;date;transfer;payee;labels";
const csv = (...lines: string[]) => [HEADER, ...lines].join("\n");

describe("parseDelimited", () => {
	it("handles quotes, escaped quotes, CRLF and a BOM", () => {
		const records = parseDelimited('﻿a;b\r\n"x;y";"say ""hi"""\r\n');
		expect(records.map((r) => r.fields)).toEqual([
			["a", "b"],
			["x;y", 'say "hi"'],
		]);
	});
});

describe("parseWalletCsv", () => {
	it("rejects a file that is not a Wallet export", () => {
		const { errors } = parseWalletCsv("x.csv", "a;b;c\n1;2;3");
		expect(errors[0]?.message).toMatch(/Cabeçalho/);
	});

	it("parses amounts to centavos and keeps identical rows apart", () => {
		const line =
			"Numerário;Transportation;MZN;100;100;Expense;Cash;;2026-08-17T10:00:00.000Z;false;;";
		const { rows, errors } = parseWalletCsv(
			"a.csv",
			csv(
				line,
				line,
				"BIM;Loans, interests;MZN;1696.67;1696.67;Expense;Cash;Me → Ussman;2026-07-07T21:22:29.243Z;false;Ussman;",
			),
		);
		expect(errors).toEqual([]);
		expect(rows).toHaveLength(3);
		expect(rows[0]!.hash).not.toBe(rows[1]!.hash);
		expect(rows[2]).toMatchObject({
			amount: 169667,
			type: "expense",
			payee: "Ussman",
			note: "Me → Ussman",
		});
	});

	it("gives the same hashes to the same rows in different files", () => {
		const line =
			"Numerário;Transportation;MZN;100;100;Expense;Cash;;2026-08-17T10:00:00.000Z;false;;";
		const a = parseWalletCsv("a.csv", csv(line, line));
		const b = parseWalletCsv("b.csv", csv(line));
		expect(b.rows[0]!.hash).toBe(a.rows[0]!.hash);
	});
});

describe("buildWalletPlan", () => {
	const file = parseWalletCsv(
		"full.csv",
		csv(
			"Numerário;Transfer, withdraw;MZN;2000;2000;Income;Cash;;2026-09-28T08:42:35.958Z;true;;",
			"FCBANK;Transfer, withdraw;MZN;2000;2000;Expense;Cash;;2026-09-28T08:42:35.958Z;true;;",
			"BIM;Transfer, withdraw;MZN;349;349;Expense;Cash;;2024-03-25T18:25:48.314Z;true;;",
			"BIM;Transfer, withdraw;MZN;1250;1250;Expense;Cash;;2024-06-23T19:15:00.000Z;true;;",
			"BIM;Transfer, withdraw;MZN;100;100;Expense;Cash;;2024-06-23T19:15:00.000Z;true;;",
			"Numerário;Transfer, withdraw;MZN;100;100;Income;Cash;;2024-06-23T19:15:00.000Z;true;;",
			"Numerário;Transfer, withdraw;MZN;1250;1250;Income;Cash;;2024-06-23T19:15:00.000Z;true;;",
			"FCBANK;Estique ou xitique;MZN;20000;20000;Expense;Cash;Junho;2026-06-24T18:06:42.221Z;false;;",
			"BCI;Estique ou xitique;MZN;14050;14050;Income;Cash;;2026-09-21T18:44:29.985Z;false;;",
			"BIM;Transportation;MZN;2000;2000;Expense;Cash;Dezembro;2026-01-05T12:09:38.392Z;false;;",
			"FCBANK;Food & Drinks;MZN;290;290;Income;Cash;;2026-10-28T12:17:08.430Z;false;;",
		),
	);

	it("pairs transfers, converts xitique and keeps the rest", () => {
		const { plan, summary } = buildWalletPlan(
			[{ name: "full.csv", rows: file.rows }],
			new Set(),
		);

		const regular = plan.transfers.filter((t) => t.kind === "transfer");
		expect(regular.map((t) => `${t.from}→${t.to} ${t.amount}`).sort()).toEqual([
			"BIM→Numerário 10000",
			"BIM→Numerário 125000",
			"FCBANK→Numerário 200000",
		]);

		const savings = plan.transfers.filter((t) => t.kind === "savings");
		expect(savings.map((t) => `${t.from}→${t.to} ${t.referenceMonth}`)).toEqual(
			["FCBANK→Xitique (Poupança) 2026-06", "Xitique (Poupança)→BCI 2026-09"],
		);

		expect(plan.review).toHaveLength(1);
		expect(plan.review[0]).toMatchObject({
			account: "BIM",
			amount: 34900,
			reason: "unpaired_transfer",
		});

		const ride = plan.transactions.find(
			(t) => t.category === "Transportation",
		)!;
		expect(ride).toMatchObject({ referenceMonth: "2025-12", note: null });

		expect(summary.totals).toMatchObject({
			new: 11,
			transferPairs: 3,
			savingsTransfers: 2,
			toReview: 1,
			referenceMonthFromNote: 2,
		});
	});

	it("skips rows already imported and rows repeated in a later file", () => {
		const overlap = parseWalletCsv(
			"recent.csv",
			csv(
				"FCBANK;Food & Drinks;MZN;290;290;Income;Cash;;2026-10-28T12:17:08.430Z;false;;",
			),
		);
		const ride = file.rows.find((r) => r.category === "Transportation")!;
		const { summary, plan } = buildWalletPlan(
			[
				{ name: "full.csv", rows: file.rows },
				{ name: "recent.csv", rows: overlap.rows },
			],
			new Set([ride.hash]),
		);
		expect(summary.files.map((f) => [f.name, f.new, f.duplicate])).toEqual([
			["full.csv", 10, 1],
			["recent.csv", 0, 1],
		]);
		expect(plan.transactions.some((t) => t.hash === ride.hash)).toBe(false);
	});
});

describe("guessAccountType", () => {
	it("recognises the accounts in the export", () => {
		expect(guessAccountType("Numerário")).toBe("cash");
		expect(guessAccountType("Emola")).toBe("mobile_wallet");
		expect(guessAccountType("BIM (Poupança)")).toBe("savings");
		expect(guessAccountType("Xitique (Poupança)")).toBe("savings");
		expect(guessAccountType("FCBANK")).toBe("bank");
	});
});

const dir = process.env.WALLET_CSV_DIR;
const realFiles = [
	"wallet_records (2).csv",
	"wallet_records (1).csv",
	"wallet_records.csv",
];
describe.runIf(dir && realFiles.every((f) => existsSync(join(dir, f))))(
	"real Wallet exports",
	() => {
		it("matches the numbers in the plan document", () => {
			const files = realFiles.map((name) => ({
				name,
				rows: parseWalletCsv(name, readFileSync(join(dir!, name), "utf8")).rows,
			}));
			const { summary } = buildWalletPlan(files, new Set());
			expect(summary.totals).toMatchObject({
				rows: 4112,
				new: 2973,
				transferPairs: 410,
				savingsTransfers: 49,
				referenceMonthFromNote: 288,
				debtNotes: 115,
				toReview: 5,
			});
			expect(summary.files.map((f) => f.new)).toEqual([2973, 0, 0]);
		});
	},
);
