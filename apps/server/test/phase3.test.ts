/**
 * Endpoint tests for Fase 3 (analytics + dynamic dashboard) and the spreadsheet import.
 * Same setup as api.test.ts: real app, local Postgres, throw-away users removed at the end.
 */
import { user } from "@wallet/db/schema/auth";
import { like, sql } from "drizzle-orm";
import { zipSync } from "fflate";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app";
import { auth, db } from "../src/services";

const app = buildApp({
	db,
	auth,
	corsOrigins: ["http://localhost:3001"],
	logger: false,
});
const EMAIL_PREFIX = `e2e-p3-${Date.now()}`;
const dbUp = await db
	.execute(sql`select 1`)
	.then(() => true)
	.catch(() => false);

type Res = { status: number; body: any };
type Client = (
	method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
	url: string,
	body?: unknown,
) => Promise<Res>;

async function signUp(tag: string): Promise<Client> {
	const res = await app.inject({
		method: "POST",
		url: "/api/auth/sign-up/email",
		headers: { origin: "http://localhost:3001" },
		payload: {
			email: `${EMAIL_PREFIX}-${tag}@example.test`,
			password: "e2e-password-123",
			name: `E2E ${tag}`,
		},
	});
	const token = res.headers["set-auth-token"];
	if (typeof token !== "string")
		throw new Error(`sign-up failed: ${res.statusCode} ${res.body}`);
	return async (method, url, body) => {
		const r = await app.inject({
			method,
			url: `/api${url}`,
			headers: { authorization: `Bearer ${token}` },
			...(body === undefined ? {} : { payload: body as object }),
		});
		return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : null };
	};
}

/** A tiny .xlsx with the "Gastos com salario" layout: a month in column A, item/value pairs in B/C or D/E. */
function buildSheet(rows: Record<string, string | number>[]) {
	const strings: string[] = [];
	const cell = (ref: string, v: string | number) => {
		if (typeof v === "number") return `<c r="${ref}"><v>${v}</v></c>`;
		strings.push(v);
		return `<c r="${ref}" t="s"><v>${strings.length - 1}</v></c>`;
	};
	const sheetXml = `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows
		.map(
			(r, i) =>
				`<row r="${i + 1}">${Object.entries(r)
					.map(([col, v]) => cell(`${col}${i + 1}`, v))
					.join("")}</row>`,
		)
		.join("")}</sheetData></worksheet>`;
	const enc = (s: string) => new TextEncoder().encode(s);
	const zip = zipSync({
		"xl/workbook.xml": enc(
			'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Gastos com salario" sheetId="1" r:id="rId1"/><sheet name="Dividas" sheetId="2" r:id="rId2"/></sheets></workbook>',
		),
		"xl/_rels/workbook.xml.rels": enc(
			'<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>',
		),
		"xl/worksheets/sheet1.xml": enc(sheetXml),
		"xl/worksheets/sheet2.xml": enc(
			'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>',
		),
		"xl/sharedStrings.xml": enc(
			`<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${strings.map((s) => `<si><t>${s}</t></si>`).join("")}</sst>`,
		),
	});
	return Buffer.from(zip).toString("base64");
}

describe.runIf(dbUp)("Fase 3 API", () => {
	let me: Client;
	let fcbank: string;
	let cash: string;
	let cats: any[];
	const cat = (name: string) => cats.find((c) => c.name === name).id as string;

	beforeAll(async () => {
		await app.ready();
		me = await signUp("me");
		cats = (await me("GET", "/categories")).body;
		fcbank = (
			await me("POST", "/accounts", {
				name: "FCBANK",
				type: "bank",
				initialBalance: 1_000_000,
			})
		).body.id;
		cash = (await me("POST", "/accounts", { name: "Numerário", type: "cash" }))
			.body.id;
		await me("POST", "/accounts", { name: "BIM (Poupança)", type: "savings" });
		const tx = (
			type: string,
			accountId: string,
			category: string | null,
			amount: number,
			occurredAt: string,
		) =>
			me("POST", "/transactions", {
				type,
				accountId,
				categoryId: category ? cat(category) : null,
				amount,
				occurredAt,
			});
		await tx("income", fcbank, "Salário", 5_500_000, "2026-10-20T10:00:00Z");
		await tx("expense", fcbank, "Moradia", 500_000, "2026-10-21T10:00:00Z");
		await tx("expense", cash, "Transporte", 10_000, "2026-10-21T08:00:00Z");
		await tx("expense", cash, "Transporte", 10_000, "2026-10-22T08:00:00Z");
		await tx("expense", cash, "Viatura", 50_000, "2026-10-23T08:00:00Z");
		await tx("income", fcbank, "Salário", 5_500_000, "2026-11-20T10:00:00Z");
		await tx("expense", fcbank, "Alimentação", 100_000, "2026-11-02T10:00:00Z");
		await me("POST", "/transfers", {
			fromAccountId: fcbank,
			toAccountId: cash,
			amount: 200_000,
			occurredAt: "2026-11-03T10:00:00Z",
		});
	});

	afterAll(async () => {
		await db.delete(user).where(like(user.email, `${EMAIL_PREFIX}-%`));
		await app.close();
	});

	describe("analytics", () => {
		it("sums income and expense of a period, without transfers, against the previous one", async () => {
			const { status, body } = await me(
				"GET",
				"/analytics/overview?from=2026-11-01&to=2026-11-30",
			);
			expect(status).toBe(200);
			expect(body).toMatchObject({
				period: { from: "2026-11-01", to: "2026-11-30", days: 30 },
				previous: { from: "2026-10-02", to: "2026-10-31", days: 30 },
				income: 5_500_000,
				expense: 100_000,
				net: 5_400_000,
				previousTotals: { income: 5_500_000, expense: 570_000, net: 4_930_000 },
			});
			const opening = 1_000_000 + 5_500_000 - 570_000;
			expect(body.balance).toEqual({
				start: opening,
				end: opening + 5_400_000,
			});
		});

		it("groups the cash flow by day, week or month", async () => {
			const daily = (
				await me("GET", "/analytics/cashflow?from=2026-10-20&to=2026-10-23")
			).body;
			expect(daily.bucket).toBe("day");
			expect(
				daily.points.map((p: any) => [p.start, p.income, p.expense]),
			).toEqual([
				["2026-10-20", 5_500_000, 0],
				["2026-10-21", 0, 510_000],
				["2026-10-22", 0, 10_000],
				["2026-10-23", 0, 50_000],
			]);
			const year = (
				await me("GET", "/analytics/cashflow?from=2026-01-01&to=2026-12-31")
			).body;
			expect(year.bucket).toBe("month");
			expect(year.points).toHaveLength(12);
			expect(year.points[9]).toMatchObject({
				start: "2026-10-01",
				end: "2026-10-31",
				income: 5_500_000,
				expense: 570_000,
			});
			const weeks = (
				await me(
					"GET",
					"/analytics/cashflow?from=2026-10-01&to=2026-11-30&bucket=week",
				)
			).body;
			expect(weeks.points[0]).toMatchObject({
				start: "2026-10-01",
				end: "2026-10-04",
			});
		});

		it("draws the total balance day by day", async () => {
			const points = (
				await me("GET", "/analytics/balance?from=2026-10-19&to=2026-10-21")
			).body;
			expect(points).toEqual([
				{ date: "2026-10-19", balance: 1_000_000 },
				{ date: "2026-10-20", balance: 6_500_000 },
				{ date: "2026-10-21", balance: 5_990_000 },
			]);
		});

		it("rolls spending up to the top-level category", async () => {
			const { body } = await me(
				"GET",
				"/analytics/categories?from=2026-10-01&to=2026-10-31",
			);
			expect(body.total).toBe(570_000);
			expect(body.items.map((i: any) => [i.name, i.expense])).toEqual([
				["Moradia", 500_000],
				["Transporte", 70_000],
			]);
			expect(body.items[0].share).toBeCloseTo(500 / 570);
		});

		it("compares the running cash flow with the previous period and a year ago", async () => {
			const { body } = await me(
				"GET",
				"/analytics/comparison?from=2026-11-01&to=2026-11-03",
			);
			expect(body).toHaveLength(3);
			expect(body[1]).toMatchObject({
				day: 2,
				date: "2026-11-02",
				current: -100_000,
				yearAgo: 0,
			});
		});

		it("validates the period", async () => {
			expect(
				(await me("GET", "/analytics/overview?from=2026-11-30&to=2026-11-01"))
					.status,
			).toBe(400);
			expect(
				(await me("GET", "/analytics/overview?from=2020-01-01&to=2026-11-01"))
					.status,
			).toBe(400);
			expect((await me("GET", "/analytics/overview?from=nov")).status).toBe(
				400,
			);
		});
	});

	describe("dashboard layout", () => {
		it("starts with the design's cards and can be rearranged", async () => {
			const first = (await me("GET", "/dashboard/cards")).body;
			expect(first.map((c: any) => c.type)).toEqual([
				"summary",
				"cash-flow-trend",
				"accounts",
				"spending-by-category",
				"upcoming",
				"period-comparison",
				"last-records",
			]);
			expect(first[0].size).toBe("full");
			expect(first[1].config).toEqual({ range: "year" });

			const added = await me("POST", "/dashboard/cards", {
				type: "balance-trend",
			});
			expect(added.status).toBe(201);
			expect(added.body.position).toBe(7);
			expect(
				(await me("POST", "/dashboard/cards", { type: "nope" })).status,
			).toBe(400);

			const resized = await me("PATCH", `/dashboard/cards/${added.body.id}`, {
				size: "full",
			});
			expect(resized.body.size).toBe("full");

			const ids = [added.body.id, ...first.map((c: any) => c.id)];
			const reordered = (await me("PUT", "/dashboard/cards/order", { ids }))
				.body;
			expect(reordered[0].type).toBe("balance-trend");
			expect(
				(await me("PUT", "/dashboard/cards/order", { ids: ids.slice(1) }))
					.status,
			).toBe(422);
		});

		it("stays empty when every card is removed, until reset", async () => {
			for (const c of (await me("GET", "/dashboard/cards")).body) {
				expect((await me("DELETE", `/dashboard/cards/${c.id}`)).status).toBe(
					204,
				);
			}
			expect((await me("GET", "/dashboard/cards")).body).toEqual([]);
			expect((await me("POST", "/dashboard/cards/reset")).body).toHaveLength(7);
		});
	});

	describe("spreadsheet import", () => {
		const sheet = buildSheet([
			{ A: "Mês", B: "Itens", C: "Valor (MZN)" },
			{ A: "Setembro", B: "Moradia", C: 5000 },
			{ B: "Transporte", C: 3000 },
			{ B: "Estique", C: 20000 },
			{ B: "Total", C: 28000 },
			{ A: "Outubro", B: "Moradia", D: 5000 },
			{ B: "Transporte", D: 3000 },
			{ B: "Estique", D: 20000 },
			{ B: "Presente Mito", D: 950 },
			{ A: "Novembro", B: "Moradia", C: 5000, D: "Alimentacao", E: 1737 },
			{ B: "Transporte", C: 3000, D: "Estique", E: 20000 },
			{ B: "Alimentação", C: 963 },
			{ B: "2 garrafas" },
		]);

		it("previews months, plan items and what the records already cover", async () => {
			const { status, body } = await me("POST", "/imports/sheet", {
				name: "folha.xlsx",
				contentBase64: sheet,
				year: 2026,
			});
			expect(status).toBe(201);
			expect(
				body.months.map((m: any) => [m.month, m.items.length, m.total]),
			).toEqual([
				["2026-09", 3, 2_800_000],
				["2026-10", 4, 2_895_000],
				["2026-11", 4, 3_070_000],
			]);
			// Alimentação appears twice in November: one line of 2 700.
			expect(
				body.months[2].items.find((i: any) => i.key === "alimentacao").amount,
			).toBe(270_000);
			expect(body.planItems.map((p: any) => p.name).sort()).toEqual([
				"Estique",
				"Moradia",
				"Transporte",
			]);
			const transporte = body.planItems.find(
				(p: any) => p.name === "Transporte",
			);
			expect(transporte).toMatchObject({
				categoryId: cat("Transporte"),
				partial: true,
				step: 10_000,
				group: "variable",
			});
			const estique = body.planItems.find((p: any) => p.name === "Estique");
			expect(estique.toAccountId).toBeNull(); // no "Xitique (Poupança)" account for this user
			const october = body.months[1];
			expect(
				october.items.find((i: any) => i.key === "moradia").walletSpent,
			).toBe(500_000);
			expect(
				october.items.find((i: any) => i.key === "transporte").walletSpent,
			).toBe(70_000);
			expect(body.skipped).toEqual([{ row: 13, text: "2 garrafas" }]);
			expect(body.otherSheets).toEqual(["Dividas"]);
		});

		it("creates the lists, pays what was paid outside the app, and can be undone", async () => {
			const preview = (
				await me("POST", "/imports/sheet", {
					name: "folha.xlsx",
					contentBase64: sheet,
					year: 2026,
				})
			).body;
			const committed = await me(
				"POST",
				`/imports/sheet/${preview.id}/commit`,
				{
					accountId: fcbank,
					months: [
						{ month: "2026-09", include: true, createPayments: true },
						{ month: "2026-10", include: true, createPayments: false },
						{ month: "2026-11", include: false, createPayments: false },
					],
				},
			);
			expect(committed.status).toBe(200);
			expect(committed.body.result).toMatchObject({
				monthItems: 7,
				planItems: 3,
				payments: 3,
			});

			const september = (await me("GET", "/budgets/months/2026-09")).body;
			expect(
				september.items.map((i: any) => [i.name, i.status]).sort(),
			).toEqual([
				["Estique", "paid"],
				["Moradia", "paid"],
				["Transporte", "paid"],
			]);
			const october = (await me("GET", "/budgets/months/2026-10")).body;
			expect(
				october.items.find((i: any) => i.name === "Moradia"),
			).toMatchObject({ status: "paid", matchedSpent: 500_000 });
			expect(
				october.items.find((i: any) => i.name === "Presente Mito"),
			).toMatchObject({ unplanned: true });
			expect((await me("GET", "/budgets/months/2026-11")).body.hasList).toBe(
				false,
			);

			const list = (await me("GET", "/imports")).body;
			expect(list[0]).toMatchObject({
				source: "sheet-xlsx",
				status: "committed",
				sheet: { year: 2026, months: 3 },
			});

			const undo = await me("DELETE", `/imports/${preview.id}`);
			expect(undo.body.removed.transactions).toBe(3);
			expect((await me("GET", "/budgets/months/2026-09")).body.items).toEqual(
				[],
			);
			expect((await me("GET", "/budgets/plans/2026")).status).toBe(404);
		});

		it("rejects a file that is not a spreadsheet", async () => {
			const res = await me("POST", "/imports/sheet", {
				name: "x.xlsx",
				contentBase64: Buffer.from("hello").toString("base64"),
				year: 2026,
			});
			expect(res.status).toBe(422);
			expect(res.body.error.code).toBe("INVALID_XLSX");
		});
	});
});
