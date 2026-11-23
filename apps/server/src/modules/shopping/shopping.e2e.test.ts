import { user } from "@wallet/db/schema/auth";
import { like, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../../app";
import { auth, db } from "../../infrastructure/services";

const app = buildApp({
	db,
	auth,
	corsOrigins: ["http://localhost:3001"],
	logger: false,
});
const EMAIL_PREFIX = `e2e-compras-${Date.now()}`;

const dbUp = await db
	.execute(sql`select 1`)
	.then(() => true)
	.catch(() => false);

type Res = { status: number; body: any };
type Client = (method: string, url: string, body?: unknown) => Promise<Res>;

async function signUp(): Promise<Client> {
	const res = await app.inject({
		method: "POST",
		url: "/api/auth/sign-up/email",
		headers: { origin: "http://localhost:3001" },
		payload: {
			email: `${EMAIL_PREFIX}@example.test`,
			password: "e2e-password-123",
			name: "E2E compras",
		},
	});
	const token = res.headers["set-auth-token"];
	if (typeof token !== "string")
		throw new Error(`sign-up failed: ${res.statusCode} ${res.body}`);
	return async (method, url, body) => {
		const r = await app.inject({
			method: method as "GET",
			url: `/api${url}`,
			headers: { authorization: `Bearer ${token}` },
			...(body === undefined ? {} : { payload: body as object }),
		});
		return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : null };
	};
}

describe.runIf(dbUp)("shopping lists", () => {
	let me: Client;
	let bank: string;
	let list: string;
	let rice: string;
	let milk: string;

	beforeAll(async () => {
		me = await signUp();
		bank = (
			await me("POST", "/accounts", {
				name: "Banco",
				type: "bank",
				initialBalance: 5_000_000,
			})
		).body.id;
	});

	afterAll(async () => {
		await db.delete(user).where(like(user.email, `${EMAIL_PREFIX}%`));
	});

	it("creates a list and adds items with estimates", async () => {
		const r = await me("POST", "/shopping-lists", {
			name: "Rancho",
			accountId: bank,
		});
		expect(r.status).toBe(201);
		list = r.body.id;
		await me("POST", `/shopping-lists/${list}/items`, {
			name: "Arroz",
			quantity: 2,
			unitPrice: 35_000,
		});
		const added = await me("POST", `/shopping-lists/${list}/items`, {
			name: "Leite",
		});
		expect(added.status).toBe(201);
		expect(added.body.items.map((i: { name: string }) => i.name)).toEqual([
			"Arroz",
			"Leite",
		]);
		expect(added.body.totals).toMatchObject({
			items: 2,
			bought: 0,
			estimated: 70_000,
			actual: 0,
		});
		[rice, milk] = added.body.items.map((i: { id: string }) => i.id);
	});

	it("buying an item creates an expense with the real price", async () => {
		const r = await me("POST", `/shopping-lists/${list}/items/${rice}/buy`, {
			amount: 68_000,
		});
		expect(r.status).toBe(201);
		const item = r.body.items.find((i: { id: string }) => i.id === rice);
		expect(item).toMatchObject({ bought: true, actual: 68_000 });
		expect(r.body.totals).toMatchObject({
			bought: 1,
			estimatedBought: 70_000,
			actual: 68_000,
		});
		const tx = (await me("GET", `/transactions/${item.transactionId}`)).body;
		expect(tx).toMatchObject({
			type: "expense",
			amount: -68_000,
			accountId: bank,
		});
		expect(tx.note).toBe("Arroz × 2 · Rancho");
	});

	it("refuses to buy the same item twice", async () => {
		const r = await me("POST", `/shopping-lists/${list}/items/${rice}/buy`, {
			amount: 1_000,
		});
		expect(r.status).toBe(409);
	});

	it("unmarking deletes the transaction", async () => {
		const before = (await me("GET", `/shopping-lists/${list}`)).body;
		const txId = before.items.find(
			(i: { id: string }) => i.id === rice,
		).transactionId;
		const r = await me("DELETE", `/shopping-lists/${list}/items/${rice}/buy`);
		expect(r.status).toBe(200);
		expect(r.body.totals.actual).toBe(0);
		expect((await me("GET", `/transactions/${txId}`)).status).toBe(404);
	});

	it("deleting the transaction elsewhere unmarks the item", async () => {
		const bought = (
			await me("POST", `/shopping-lists/${list}/items/${milk}/buy`, {
				amount: 9_000,
			})
		).body;
		const txId = bought.items.find(
			(i: { id: string }) => i.id === milk,
		).transactionId;
		await me("DELETE", `/transactions/${txId}`);
		const after = (await me("GET", `/shopping-lists/${list}`)).body;
		expect(after.items.find((i: { id: string }) => i.id === milk).bought).toBe(
			false,
		);
	});

	it("a list linked to a budget item pays that item", async () => {
		const year = new Date().getFullYear();
		const month = `${year}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
		await me("POST", "/budgets/plans", { year, expectedIncome: 5_000_000 });
		const planItem = await me("POST", `/budgets/plans/${year}/items`, {
			name: "Supermercado",
			amount: 300_000,
		});
		expect(planItem.status).toBeLessThan(300);
		await me("POST", `/budgets/plans/${year}/generate`);
		const budget = (await me("GET", `/budgets/months/${month}`)).body;
		const monthItem = budget.items.find(
			(i: { name: string }) => i.name === "Supermercado",
		);
		const linked = (
			await me("POST", "/shopping-lists", {
				name: "Super",
				accountId: bank,
				monthItemId: monthItem.id,
			})
		).body;
		expect(linked.monthItem).toMatchObject({ name: "Supermercado", month });
		const withItem = (
			await me("POST", `/shopping-lists/${linked.id}/items`, { name: "Pão" })
		).body;
		await me(
			"POST",
			`/shopping-lists/${linked.id}/items/${withItem.items[0].id}/buy`,
			{ amount: 5_000 },
		);
		const after = (await me("GET", `/budgets/months/${month}`)).body;
		expect(
			after.items.find((i: { id: string }) => i.id === monthItem.id).spent,
		).toBe(5_000);
	});

	it("remembers the last price paid per unit", async () => {
		await me("POST", `/shopping-lists/${list}/items/${rice}/buy`, {
			amount: 72_000,
		});
		const prices = (await me("GET", "/shopping-lists/prices")).body;
		expect(prices).toContainEqual(
			expect.objectContaining({ name: "Arroz", unitPrice: 36_000, paid: true }),
		);
		expect(prices).toContainEqual(
			expect.objectContaining({ name: "Pão", unitPrice: 5_000, paid: true }),
		);
		expect(prices.some((p: { name: string }) => p.name === "Leite")).toBe(
			false,
		);
	});

	it("duplicating a list copies the items to buy with the last price", async () => {
		const r = await me("POST", `/shopping-lists/${list}/duplicate`, {
			name: "Rancho de Janeiro",
		});
		expect(r.status).toBe(201);
		expect(r.body).toMatchObject({
			name: "Rancho de Janeiro",
			accountId: bank,
			totals: { items: 2, bought: 0, estimated: 72_000 },
		});
		expect(
			r.body.items.map((i: { name: string; unitPrice: number | null }) => [
				i.name,
				i.unitPrice,
			]),
		).toEqual([
			["Arroz", 36_000],
			["Leite", null],
		]);
	});

	it("deleting a list keeps the purchases as transactions", async () => {
		const bought = (await me("GET", `/shopping-lists/${list}`)).body;
		const txId = bought.items.find(
			(i: { id: string }) => i.id === rice,
		).transactionId;
		expect((await me("DELETE", `/shopping-lists/${list}`)).status).toBe(204);
		expect((await me("GET", `/transactions/${txId}`)).status).toBe(200);
		expect((await me("GET", `/shopping-lists/${list}`)).status).toBe(404);
	});
});
