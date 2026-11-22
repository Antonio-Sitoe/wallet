/**
 * Endpoint tests: the real app, the real auth, the local Postgres (DATABASE_URL from apps/server/.env).
 * Each run signs up throw-away users (e2e-*@example.test) and deletes them at the end.
 * Set WALLET_CSV_DIR to a folder holding the three Wallet exports to also import the full history.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { user } from "@wallet/db/schema/auth";
import { like, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app";
import { auth, db } from "../src/services";

const app = buildApp({
	db,
	auth,
	corsOrigins: ["http://localhost:3001"],
	logger: false,
});
const EMAIL_PREFIX = `e2e-${Date.now()}`;

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

const CSV_HEADER =
	"account;category;currency;amount;ref_currency_amount;type;payment_type;note;date;transfer;payee;labels";
const SAMPLE_CSV = [
	CSV_HEADER,
	"FCBANK;Income;MZN;55000;55000;Income;Cash;;2026-10-28T10:00:00.000Z;false;FCB;",
	"Numerário;Transfer, withdraw;MZN;2000;2000;Income;Cash;;2026-10-27T05:05:41.900Z;true;;",
	"FCBANK;Transfer, withdraw;MZN;2000;2000;Expense;Cash;;2026-10-27T05:05:41.900Z;true;;",
	"FCBANK;Estique ou xitique;MZN;20000;20000;Expense;Cash;Junho;2026-06-24T18:06:42.221Z;false;;",
	"Numerário;Transportation;MZN;100;100;Expense;Cash;;2026-08-17T10:00:00.000Z;false;;",
	"Numerário;Transportation;MZN;100;100;Expense;Cash;;2026-08-17T10:00:00.000Z;false;;",
	"Numerário;Transportation;MZN;2000;2000;Expense;Cash;Abril;2026-05-11T09:32:37.609Z;false;;",
	"BIM;Transfer, withdraw;MZN;349;349;Expense;Cash;;2024-03-25T18:25:48.314Z;true;;",
	"BIM;Mesada de wil;MZN;320;320;Expense;Cash;outubro;2025-09-30T18:39:59.469Z;false;;",
	"BIM;Uma categoria nova;MZN;50;50;Expense;Cash;;2025-09-30T18:40:00.000Z;false;;",
].join("\n");

describe.runIf(dbUp)("API", () => {
	let me: Client;
	let someoneElse: Client;

	beforeAll(async () => {
		await app.ready();
		me = await signUp("me");
		someoneElse = await signUp("other");
	});

	afterAll(async () => {
		await db.delete(user).where(like(user.email, `${EMAIL_PREFIX}-%`));
		await app.close();
	});

	it("rejects requests without a session", async () => {
		const res = await app.inject({ method: "GET", url: "/api/accounts" });
		expect(res.statusCode).toBe(401);
		expect(res.json().error.code).toBe("UNAUTHORIZED");
	});

	describe("categories", () => {
		it("seeds the default tree with the Wallet mapping on first use", async () => {
			const { status, body } = await me("GET", "/categories");
			expect(status).toBe(200);
			const byName = (n: string) => body.find((c: any) => c.name === n);
			expect(byName("Transporte").walletNames).toContain("Transportation");
			expect(byName("Faculdade").parentId).toBe(byName("Educação").id);
			expect(byName("Transferência")).toMatchObject({
				kind: "system",
				isSystem: true,
			});
		});

		it("creates, renames and deletes a subcategory", async () => {
			const { body: cats } = await me("GET", "/categories");
			const familia = cats.find((c: any) => c.name === "Família");
			const created = await me("POST", "/categories", {
				name: "Vovó Ester",
				kind: "expense",
				parentId: familia.id,
			});
			expect(created.status).toBe(201);
			const renamed = await me("PATCH", `/categories/${created.body.id}`, {
				name: "Vovó Ester Sitoe",
			});
			expect(renamed.body.name).toBe("Vovó Ester Sitoe");
			expect(
				(await me("DELETE", `/categories/${created.body.id}`)).status,
			).toBe(204);
		});

		it("refuses a third level, duplicates and editing system categories", async () => {
			const { body: cats } = await me("GET", "/categories");
			const faculdade = cats.find((c: any) => c.name === "Faculdade");
			const transfer = cats.find((c: any) => c.name === "Transferência");
			expect(
				(
					await me("POST", "/categories", {
						name: "Propinas",
						kind: "expense",
						parentId: faculdade.id,
					})
				).status,
			).toBe(422);
			expect(
				(
					await me("POST", "/categories", {
						name: "transporte",
						kind: "expense",
					})
				).status,
			).toBe(409);
			expect(
				(await me("PATCH", `/categories/${transfer.id}`, { name: "x" })).status,
			).toBe(403);
		});

		it("maps a Wallet category name", async () => {
			const { body: cats } = await me("GET", "/categories");
			const lazer = cats.find((c: any) => c.name === "Lazer");
			const { body: map } = await me("PUT", "/categories/wallet-map", {
				walletName: "Cinema",
				categoryId: lazer.id,
			});
			expect(map).toContainEqual({
				walletName: "Cinema",
				categoryId: lazer.id,
			});
		});
	});

	describe("accounts, transactions and transfers", () => {
		let fcbank: any;
		let cash: any;
		let cats: any[];
		const cat = (name: string) => cats.find((c) => c.name === name).id;

		beforeAll(async () => {
			cats = (await me("GET", "/categories")).body;
			fcbank = (await me("POST", "/accounts", { name: "FCBANK", type: "bank" }))
				.body;
			cash = (
				await me("POST", "/accounts", { name: "Numerário", type: "cash" })
			).body;
		});

		it("creates accounts starting at 0 and validates input", async () => {
			expect(fcbank).toMatchObject({
				balance: 0,
				initialBalance: 0,
				type: "bank",
			});
			expect(
				(await me("POST", "/accounts", { name: "fcbank", type: "bank" }))
					.status,
			).toBe(409);
			const bad = await me("POST", "/accounts", { name: "", type: "nope" });
			expect(bad.status).toBe(400);
			expect(bad.body.error.details).toHaveLength(2);
		});

		it("records income and expenses with the sign from the type", async () => {
			const salary = await me("POST", "/transactions", {
				type: "income",
				accountId: fcbank.id,
				categoryId: cat("Salário"),
				amount: 5_500_000,
				occurredAt: "2026-10-28T10:00:00Z",
			});
			expect(salary.status).toBe(201);
			expect(salary.body).toMatchObject({
				amount: 5_500_000,
				referenceMonth: "2026-10",
			});

			const ride = await me("POST", "/transactions", {
				type: "expense",
				accountId: cash.id,
				categoryId: cat("Transporte"),
				amount: 10_000,
				occurredAt: "2026-11-16T10:00:00Z",
			});
			expect(ride.body.amount).toBe(-10_000);

			const school = await me("POST", "/transactions", {
				type: "expense",
				accountId: fcbank.id,
				categoryId: cat("Faculdade"),
				amount: 567_000,
				occurredAt: "2026-10-30T10:00:00Z",
				referenceMonth: "2026-11",
			});
			expect(school.body.referenceMonth).toBe("2026-11");
			expect(
				(
					await me("POST", "/transactions", {
						type: "expense",
						accountId: cash.id,
						amount: 0,
						occurredAt: "2026-11-16",
					})
				).status,
			).toBe(400);
		});

		it("edits and deletes a transaction", async () => {
			const created = await me("POST", "/transactions", {
				type: "expense",
				accountId: cash.id,
				amount: 5_000,
				occurredAt: "2026-11-10T10:00:00Z",
				note: "pão",
			});
			const edited = await me("PATCH", `/transactions/${created.body.id}`, {
				amount: 7_500,
				occurredAt: "2026-12-01T10:00:00Z",
			});
			// The budget month follows the date unless it was set apart from it.
			expect(edited.body).toMatchObject({
				amount: -7_500,
				referenceMonth: "2026-12",
				note: "pão",
			});
			expect(
				(await me("DELETE", `/transactions/${created.body.id}`)).status,
			).toBe(204);
			expect((await me("GET", `/transactions/${created.body.id}`)).status).toBe(
				404,
			);
		});

		it("moves money with a transfer and keeps both legs in step", async () => {
			const t = await me("POST", "/transfers", {
				fromAccountId: fcbank.id,
				toAccountId: cash.id,
				amount: 200_000,
				occurredAt: "2026-11-01T08:00:00Z",
			});
			expect(t.status).toBe(201);
			expect(t.body.legs.outId).toBeTruthy();

			const leg = await me("PATCH", `/transactions/${t.body.legs.outId}`, {
				amount: 1,
			});
			expect(leg.status).toBe(409);
			expect(leg.body.error.code).toBe("IS_TRANSFER");

			expect(
				(await me("PATCH", `/transfers/${t.body.id}`, { amount: 300_000 })).body
					.amount,
			).toBe(300_000);
			const out = await me("GET", `/transactions/${t.body.legs.outId}`);
			expect(out.body).toMatchObject({
				amount: -300_000,
				type: "transfer",
				counterpartAccountId: cash.id,
			});

			expect(
				(
					await me("POST", "/transfers", {
						fromAccountId: cash.id,
						toAccountId: cash.id,
						amount: 1,
						occurredAt: "2026-11-01",
					})
				).status,
			).toBe(400);
		});

		it("computes balances from the initial balance and every transaction", async () => {
			const { body } = await me("GET", "/accounts");
			const balance = (id: string) =>
				body.find((a: any) => a.id === id).balance;
			expect(balance(fcbank.id)).toBe(5_500_000 - 567_000 - 300_000);
			expect(balance(cash.id)).toBe(300_000 - 10_000);
		});

		it("reconciles an account to today's real balance", async () => {
			const { body } = await me("POST", `/accounts/${fcbank.id}/reconcile`, {
				balance: 8_443_100,
			});
			expect(body.balance).toBe(8_443_100);
			expect(body.initialBalance).toBe(
				8_443_100 - (5_500_000 - 567_000 - 300_000),
			);
		});

		it("archives instead of deleting an account in use", async () => {
			expect((await me("DELETE", `/accounts/${fcbank.id}`)).status).toBe(409);
			const emola = (
				await me("POST", "/accounts", { name: "Emola", type: "mobile_wallet" })
			).body;
			await me("PATCH", `/accounts/${emola.id}`, { archived: true });
			expect(
				(await me("GET", "/accounts")).body.some((a: any) => a.id === emola.id),
			).toBe(false);
			expect(
				(await me("GET", "/accounts?includeArchived=true")).body.some(
					(a: any) => a.id === emola.id,
				),
			).toBe(true);
			expect((await me("DELETE", `/accounts/${emola.id}`)).status).toBe(204);
		});

		it("filters and pages the transaction list", async () => {
			const byParent = await me(
				"GET",
				`/transactions?categoryId=${cat("Educação")}`,
			);
			expect(byParent.body.items).toHaveLength(1);

			const november = await me(
				"GET",
				"/transactions?referenceMonth=2026-11&type=expense",
			);
			expect(november.body.items).toHaveLength(2);

			const both = await me(
				"GET",
				`/transactions?accountId=${fcbank.id}&accountId=${cash.id}&from=2026-11-01T00:00:00Z`,
			);
			expect(
				both.body.items.every((t: any) => t.occurredAt >= "2026-11-01"),
			).toBe(true);

			const first = await me("GET", "/transactions?limit=2");
			const second = await me(
				"GET",
				`/transactions?limit=2&cursor=${first.body.nextCursor}`,
			);
			const third = await me(
				"GET",
				`/transactions?limit=2&cursor=${second.body.nextCursor}`,
			);
			const ids = [
				...first.body.items,
				...second.body.items,
				...third.body.items,
			].map((t: any) => t.id);
			expect(ids).toHaveLength(5);
			expect(new Set(ids).size).toBe(5);
			expect(third.body.nextCursor).toBeNull();

			expect((await me("GET", "/transactions?cursor=garbage")).status).toBe(
				400,
			);
		});

		it("keeps every user's data apart", async () => {
			const { body } = await me("GET", "/transactions?limit=1");
			expect(
				(await someoneElse("GET", `/transactions/${body.items[0].id}`)).status,
			).toBe(404);
			expect((await someoneElse("GET", "/accounts")).body).toEqual([]);
			const sneak = await someoneElse("POST", "/transactions", {
				type: "expense",
				accountId: cash.id,
				amount: 100,
				occurredAt: "2026-11-16T10:00:00Z",
			});
			expect(sneak.status).toBe(422);
		});
	});

	describe("Wallet import", () => {
		let importer: Client;
		beforeAll(async () => {
			importer = await signUp("import");
		});

		it("previews, requires unknown categories to be mapped, commits and undoes", async () => {
			const preview = await importer("POST", "/imports/wallet", {
				files: [{ name: "sample.csv", content: SAMPLE_CSV }],
			});
			expect(preview.status).toBe(201);
			expect(preview.body.totals).toMatchObject({
				new: 10,
				transferPairs: 1,
				savingsTransfers: 1,
				toReview: 1,
				referenceMonthFromNote: 3,
			});
			expect(
				preview.body.categories.find(
					(c: any) => c.walletName === "Uma categoria nova",
				).categoryId,
			).toBeNull();
			expect((await importer("GET", "/transactions")).body.items).toEqual([]);

			const blocked = await importer(
				"POST",
				`/imports/${preview.body.id}/commit`,
				{},
			);
			expect(blocked.status).toBe(422);
			expect(blocked.body.error.details).toEqual(["Uma categoria nova"]);

			const cats = (await importer("GET", "/categories")).body;
			const social = cats.find(
				(c: any) => c.name === "Social / Imprevistos",
			).id;
			const committed = await importer(
				"POST",
				`/imports/${preview.body.id}/commit`,
				{
					categoryMap: { "Uma categoria nova": social },
					resolutions: { [preview.body.review[0].key]: "keep" },
				},
			);
			expect(committed.status).toBe(200);
			// 6 plain rows + 1 kept + 2 transfers × 2 legs.
			expect(committed.body.result).toMatchObject({
				transactions: 11,
				transfers: 2,
				ignored: 0,
			});

			const accounts = (await importer("GET", "/accounts")).body;
			const byName = (n: string) => accounts.find((a: any) => a.name === n);
			expect(byName("Xitique (Poupança)")).toMatchObject({
				type: "savings",
				balance: 2_000_000,
			});
			expect(byName("Numerário")).toMatchObject({
				type: "cash",
				balance: 200_000 - 10_000 - 10_000 - 200_000,
			});

			const april = (
				await importer("GET", "/transactions?referenceMonth=2026-04")
			).body.items;
			expect(april).toHaveLength(1);
			expect(april[0].note).toBeNull();

			const again = await importer("POST", "/imports/wallet", {
				files: [{ name: "sample.csv", content: SAMPLE_CSV }],
			});
			expect(again.body.totals.new).toBe(0);
			expect(
				(await importer("DELETE", `/imports/${again.body.id}`)).body.removed,
			).toEqual({ transactions: 0, transfers: 0 });

			expect(
				(await importer("POST", `/imports/${preview.body.id}/commit`, {}))
					.status,
			).toBe(409);
			const undo = await importer("DELETE", `/imports/${preview.body.id}`);
			expect(undo.body.removed).toEqual({ transactions: 11, transfers: 2 });
			expect((await importer("GET", "/transactions")).body.items).toEqual([]);
			expect(
				(await importer("GET", "/imports")).body.map((b: any) => b.status),
			).toEqual(["reverted"]);
		});

		it("rejects files that are not Wallet exports", async () => {
			const res = await importer("POST", "/imports/wallet", {
				files: [{ name: "x.csv", content: "a;b\n1;2" }],
			});
			expect(res.status).toBe(422);
			expect(res.body.error.code).toBe("INVALID_CSV");
		});

		const dir = process.env.WALLET_CSV_DIR;
		const realFiles = [
			"wallet_records (2).csv",
			"wallet_records (1).csv",
			"wallet_records.csv",
		];
		it.runIf(dir && realFiles.every((f) => existsSync(join(dir, f))))(
			"imports the full 2023–2026 history",
			async () => {
				const full = await signUp("full");
				const files = realFiles.map((name) => ({
					name,
					content: readFileSync(join(dir!, name), "utf8"),
				}));
				const preview = await full("POST", "/imports/wallet", { files });
				expect(preview.body.totals).toMatchObject({
					new: 2973,
					transferPairs: 410,
					savingsTransfers: 49,
					toReview: 5,
				});
				expect(preview.body.categories.every((c: any) => c.categoryId)).toBe(
					true,
				);
				const committed = await full(
					"POST",
					`/imports/${preview.body.id}/commit`,
					{},
				);
				expect(committed.body.result).toMatchObject({
					transactions: 3017,
					transfers: 459,
					ignored: 5,
				});
				expect((await full("GET", "/accounts")).body).toHaveLength(7);
				expect(
					(await full("POST", "/imports/wallet", { files })).body.totals.new,
				).toBe(0);
			},
			60_000,
		);
	});
});
