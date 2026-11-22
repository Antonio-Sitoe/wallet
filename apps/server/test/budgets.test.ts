/**
 * Endpoint tests for the budget (Fase 2): yearly plan, monthly lists, check = transaction.
 * Same setup as api.test.ts: real app, local Postgres, throw-away users removed at the end.
 */
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
const EMAIL_PREFIX = `e2e-budget-${Date.now()}`;
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

describe.runIf(dbUp)("Budget API", () => {
	let me: Client;
	let other: Client;
	let fcbank: string;
	let cash: string;
	let savings: string;
	let cats: any[];
	const cat = (name: string) => cats.find((c) => c.name === name).id as string;
	const ids: Record<string, string> = {};
	const nov = async () => (await me("GET", "/budgets/months/2026-11")).body;
	const novItem = async (name: string) =>
		(await nov()).items.find((i: any) => i.name === name);

	beforeAll(async () => {
		await app.ready();
		me = await signUp("me");
		other = await signUp("other");
		cats = (await me("GET", "/categories")).body;
		fcbank = (await me("POST", "/accounts", { name: "FCBANK", type: "bank" }))
			.body.id;
		cash = (await me("POST", "/accounts", { name: "Numerário", type: "cash" }))
			.body.id;
		savings = (
			await me("POST", "/accounts", { name: "BIM (Poupança)", type: "savings" })
		).body.id;
	});

	afterAll(async () => {
		await db.delete(user).where(like(user.email, `${EMAIL_PREFIX}-%`));
		await app.close();
	});

	it("creates a yearly plan with its items", async () => {
		const plan = await me("POST", "/budgets/plans", {
			year: 2026,
			expectedIncome: 5_500_000,
		});
		expect(plan.status).toBe(201);
		expect(plan.body).toMatchObject({
			year: 2026,
			expectedIncome: 5_500_000,
			generated: false,
			items: [],
		});
		expect((await me("POST", "/budgets/plans", { year: 2026 })).status).toBe(
			409,
		);

		const add = (body: object) => me("POST", "/budgets/plans/2026/items", body);
		const items = [
			{
				name: "Moradia",
				group: "fixed",
				categoryId: cat("Moradia"),
				amount: 500_000,
				accountId: fcbank,
			},
			{
				name: "Transporte",
				group: "variable",
				categoryId: cat("Transporte"),
				amount: 300_000,
				accountId: cash,
				partial: true,
				step: 10_000,
			},
			{
				name: "Emergência",
				group: "savings",
				categoryId: cat("Poupança"),
				amount: 600_000,
				accountId: fcbank,
				toAccountId: savings,
			},
			{
				name: "Escola de Inglês",
				categoryId: cat("Escola de Inglês"),
				amount: 230_000,
				frequency: "months",
				months: [6, 7, 8],
			},
			{
				name: "Obra",
				group: "oneoff",
				categoryId: cat("Obra"),
				amount: 3_000_000,
				frequency: "once",
				months: [11],
				accountId: fcbank,
			},
		];
		for (const body of items) {
			const res = await add(body);
			expect(res.status).toBe(201);
			ids[res.body.name] = res.body.id;
		}
		expect(
			(await add({ name: "x", amount: 1, frequency: "once", months: [1, 2] }))
				.status,
		).toBe(400);
		expect(
			(await add({ name: "x", amount: 1, frequency: "months", months: [] }))
				.status,
		).toBe(400);
		expect(
			(
				await add({
					name: "x",
					amount: 1,
					accountId: fcbank,
					toAccountId: fcbank,
				})
			).status,
		).toBe(422);
	});

	it("generates the 12 monthly lists from the plan", async () => {
		const { body } = await me("POST", "/budgets/plans/2026/generate");
		expect(body.created).toBe(12 + 12 + 12 + 3 + 1);
		expect(body.plan.generated).toBe(true);
		const november = body.plan.months.find((m: any) => m.month === "2026-11");
		expect(november).toMatchObject({
			items: 4,
			planned: 4_400_000,
			overIncome: false,
		});
		expect(body.plan.totals.year).toBe(
			12 * 500_000 + 12 * 300_000 + 12 * 600_000 + 3 * 230_000 + 3_000_000,
		);
		// Generating again adds nothing.
		expect(
			(await me("POST", "/budgets/plans/2026/generate")).body.created,
		).toBe(0);
	});

	it("shows a month as a checklist", async () => {
		const month = await nov();
		expect(month).toMatchObject({
			hasList: true,
			planYear: 2026,
			expectedIncome: 5_500_000,
		});
		expect(month.items.map((i: any) => i.name)).toEqual([
			"Moradia",
			"Transporte",
			"Emergência",
			"Obra",
		]);
		expect(
			month.items.every((i: any) => i.status === "unpaid" && !i.checked),
		).toBe(true);
		expect(month.totals).toMatchObject({
			planned: 4_400_000,
			spent: 0,
			remaining: 4_400_000,
			leftover: 1_100_000,
		});

		const empty = await me("GET", "/budgets/months/2030-01");
		expect(empty.body).toMatchObject({
			hasList: false,
			planYear: null,
			items: [],
		});
	});

	it("check creates the transaction with the month as budget month", async () => {
		const moradia = await novItem("Moradia");
		const paid = await me(
			"POST",
			`/budgets/month-items/${moradia.id}/payments`,
			{
				occurredAt: "2026-10-30T10:00:00Z",
			},
		);
		expect(paid.status).toBe(201);
		expect(paid.body).toMatchObject({
			status: "paid",
			checked: true,
			spent: 500_000,
			linkedSpent: 500_000,
		});

		const tx = (
			await me("GET", `/transactions/${paid.body.payments[0].transactionId}`)
		).body;
		expect(tx).toMatchObject({
			type: "expense",
			amount: -500_000,
			accountId: fcbank,
			categoryId: cat("Moradia"),
			referenceMonth: "2026-11",
			monthItemId: moradia.id,
		});
		const again = await me(
			"POST",
			`/budgets/month-items/${moradia.id}/payments`,
			{},
		);
		expect(again.status).toBe(422);
		expect(again.body.error.code).toBe("NOTHING_TO_PAY");
	});

	it("partial items take several launches and count loose transactions of their category", async () => {
		const transporte = await novItem("Transporte");
		await me("POST", `/budgets/month-items/${transporte.id}/payments`, {});
		const second = await me(
			"POST",
			`/budgets/month-items/${transporte.id}/payments`,
			{},
		);
		expect(second.body).toMatchObject({
			spent: 20_000,
			status: "partial",
			checked: false,
			remaining: 280_000,
		});
		expect(second.body.payments).toHaveLength(2);
		expect(second.body.payments[0].accountId).toBe(cash);

		// The daily ride registered elsewhere still counts for the Transporte item.
		await me("POST", "/transactions", {
			type: "expense",
			accountId: cash,
			categoryId: cat("Transporte"),
			amount: 10_000,
			occurredAt: "2026-11-16T10:00:00Z",
		});
		const after = await novItem("Transporte");
		expect(after).toMatchObject({
			linkedSpent: 20_000,
			matchedSpent: 10_000,
			spent: 30_000,
		});
	});

	it("a savings item is paid by a transfer into its account", async () => {
		const emergencia = await novItem("Emergência");
		const paid = await me(
			"POST",
			`/budgets/month-items/${emergencia.id}/payments`,
			{},
		);
		expect(paid.body).toMatchObject({ status: "paid", spent: 600_000 });
		expect(paid.body.payments[0].transferId).toBeTruthy();
		const accounts = (await me("GET", "/accounts")).body;
		expect(accounts.find((a: any) => a.id === savings).balance).toBe(600_000);
		const transfer = (
			await me("GET", `/transfers/${paid.body.payments[0].transferId}`)
		).body;
		expect(transfer).toMatchObject({
			fromAccountId: fcbank,
			toAccountId: savings,
			monthItemId: emergencia.id,
		});
	});

	it("pays below, up to and above the plan, and uncheck deletes the payments", async () => {
		const obra = await novItem("Obra");
		const part = await me("POST", `/budgets/month-items/${obra.id}/payments`, {
			amount: 1_000_000,
		});
		expect(part.body).toMatchObject({
			status: "partial",
			remaining: 2_000_000,
		});
		const rest = await me(
			"POST",
			`/budgets/month-items/${obra.id}/payments`,
			{},
		);
		expect(rest.body).toMatchObject({ status: "paid", spent: 3_000_000 });
		const over = await me("POST", `/budgets/month-items/${obra.id}/payments`, {
			amount: 5_000,
		});
		expect(over.body.status).toBe("over");

		const one = await me(
			"DELETE",
			`/budgets/month-items/${obra.id}/payments/${over.body.payments[0].transactionId}`,
		);
		expect(one.body).toMatchObject({ status: "paid", spent: 3_000_000 });

		const txIds = one.body.payments.map((p: any) => p.transactionId);
		const unpaid = await me(
			"DELETE",
			`/budgets/month-items/${obra.id}/payments`,
		);
		expect(unpaid.body).toMatchObject({
			status: "unpaid",
			spent: 0,
			payments: [],
		});
		for (const id of txIds)
			expect((await me("GET", `/transactions/${id}`)).status).toBe(404);
	});

	it("deleting a payment from the transactions list unchecks the item", async () => {
		const moradia = await novItem("Moradia");
		await me("DELETE", `/transactions/${moradia.payments[0].transactionId}`);
		expect((await novItem("Moradia")).status).toBe("unpaid");
		await me("POST", `/budgets/month-items/${moradia.id}/payments`, {});
	});

	it("adds unplanned items and reports what nothing on the list explains", async () => {
		const added = await me("POST", "/budgets/months/2026-11/items", {
			name: "Presente Mito",
			categoryId: cat("Presentes e doações"),
			amount: 150_000,
		});
		expect(added.status).toBe(201);
		expect(added.body).toMatchObject({
			unplanned: true,
			group: "oneoff",
			defaultAccountId: null,
		});
		const noAccount = await me(
			"POST",
			`/budgets/month-items/${added.body.id}/payments`,
			{},
		);
		expect(noAccount.body.error.code).toBe("ACCOUNT_REQUIRED");
		await me("POST", `/budgets/month-items/${added.body.id}/payments`, {
			accountId: cash,
		});

		await me("POST", "/transactions", {
			type: "expense",
			accountId: cash,
			categoryId: cat("Roupa"),
			amount: 20_000,
			occurredAt: "2026-11-20T10:00:00Z",
		});
		await me("POST", "/transactions", {
			type: "income",
			accountId: fcbank,
			categoryId: cat("Salário"),
			amount: 5_500_000,
			occurredAt: "2026-11-25T10:00:00Z",
		});
		const month = await nov();
		expect(month.items.at(-1).name).toBe("Presente Mito");
		expect(month.income).toBe(5_500_000);
		expect(month.totals).toMatchObject({
			unplanned: 150_000,
			unassignedSpent: 20_000,
			planned: 4_550_000,
			spent: 500_000 + 30_000 + 600_000 + 150_000,
		});

		expect(
			(await me("DELETE", `/budgets/month-items/${added.body.id}`)).status,
		).toBe(409);
		const plain = await me("POST", "/budgets/months/2026-11/items", {
			name: "Talvez",
			amount: 1_000,
		});
		expect(
			(await me("DELETE", `/budgets/month-items/${plain.body.id}`)).status,
		).toBe(204);
	});

	it("plan changes apply from a month on and leave paid months alone", async () => {
		const res = await me("PATCH", `/budgets/plan-items/${ids.Moradia}`, {
			amount: 600_000,
			applyFrom: "2026-11",
		});
		expect(res.body.amount).toBe(600_000);
		const plan = (await me("GET", "/budgets/plans/2026?asOf=2026-11")).body;
		const moradia = plan.items.find((i: any) => i.name === "Moradia");
		const planned = (m: string) =>
			moradia.byMonth.find((x: any) => x.month === m).planned;
		expect(planned("2026-10")).toBe(500_000);
		expect(planned("2026-11")).toBe(500_000); // paid: kept
		expect(planned("2026-12")).toBe(600_000);

		await me("PATCH", `/budgets/plan-items/${ids["Escola de Inglês"]}`, {
			months: [7, 8, 9],
			applyFrom: "2026-06",
		});
		const ingles = (await me("GET", "/budgets/plans/2026")).body.items.find(
			(i: any) => i.name === "Escola de Inglês",
		);
		expect(ingles.byMonth.map((m: any) => m.month)).toEqual([
			"2026-07",
			"2026-08",
			"2026-09",
		]);
		expect(
			(await me("GET", "/budgets/months/2026-06")).body.items.some(
				(i: any) => i.name === "Escola de Inglês",
			),
		).toBe(false);
		expect(
			(await me("GET", "/budgets/months/2026-09")).body.items.some(
				(i: any) => i.name === "Escola de Inglês",
			),
		).toBe(true);

		expect(
			(
				await me(
					"DELETE",
					`/budgets/plan-items/${ids["Escola de Inglês"]}?applyFrom=2026-01`,
				)
			).status,
		).toBe(204);
		const after = (await me("GET", "/budgets/plans/2026")).body;
		expect(after.items.some((i: any) => i.name === "Escola de Inglês")).toBe(
			false,
		);
		expect(
			(await me("GET", "/budgets/months/2026-08")).body.items.some(
				(i: any) => i.name === "Escola de Inglês",
			),
		).toBe(false);
	});

	it("shows projected vs spent to date and the pace per item", async () => {
		const plan = (await me("GET", "/budgets/plans/2026?asOf=2026-11")).body;
		const transporte = plan.items.find((i: any) => i.name === "Transporte");
		expect(transporte).toMatchObject({
			projected: 12 * 300_000,
			plannedToDate: 11 * 300_000,
			spentToDate: 30_000,
			pace: "within",
		});
		const obra = plan.items.find((i: any) => i.name === "Obra");
		expect(obra).toMatchObject({ pace: "no_data", pacePercent: null });
	});

	it("copies a plan into a new year", async () => {
		const copy = await me("POST", "/budgets/plans", {
			year: 2027,
			copyFrom: 2026,
		});
		expect(copy.status).toBe(201);
		expect(copy.body.expectedIncome).toBe(5_500_000);
		// One-off items (Obra) are not copied by default.
		expect(copy.body.items.map((i: any) => i.name)).toEqual([
			"Moradia",
			"Transporte",
			"Emergência",
		]);
		expect(copy.body.items[0].amount).toBe(600_000);
		expect(
			(await me("GET", "/budgets/plans")).body.map((p: any) => [
				p.year,
				p.generated,
			]),
		).toEqual([
			[2026, true],
			[2027, false],
		]);
		expect((await me("DELETE", "/budgets/plans/2027")).status).toBe(204);
		expect((await me("DELETE", "/budgets/plans/2026")).status).toBe(409);
	});

	it("an item added to a generated plan joins the lists from this month on", async () => {
		await me("POST", "/budgets/plans", { year: 2099 });
		await me("POST", "/budgets/plans/2099/items", {
			name: "Base",
			amount: 1_000,
		});
		await me("POST", "/budgets/plans/2099/generate");
		await me("POST", "/budgets/plans/2099/items", {
			name: "Claude Code",
			amount: 140_000,
		});
		const plan = (await me("GET", "/budgets/plans/2099")).body;
		expect(plan.months.every((m: any) => m.items === 2)).toBe(true);
	});

	it("keeps every user's budget apart", async () => {
		const moradia = await novItem("Moradia");
		expect(
			(await other("GET", `/budgets/month-items/${moradia.id}`)).status,
		).toBe(404);
		expect(
			(await other("POST", `/budgets/month-items/${moradia.id}/payments`, {}))
				.status,
		).toBe(404);
		expect((await other("GET", "/budgets/plans/2026")).status).toBe(404);
		const otherAccount = (
			await other("POST", "/accounts", { name: "Conta", type: "cash" })
		).body.id;
		const sneak = await other("POST", "/transactions", {
			type: "expense",
			accountId: otherAccount,
			amount: 100,
			occurredAt: "2026-11-01",
			monthItemId: moradia.id,
		});
		expect(sneak.status).toBe(422);
		expect(sneak.body.error.code).toBe("UNKNOWN_MONTH_ITEM");
	});
});
