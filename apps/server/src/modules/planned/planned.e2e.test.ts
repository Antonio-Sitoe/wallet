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
const EMAIL_PREFIX = `e2e-planeados-${Date.now()}`;

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
			name: "E2E planeados",
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

const WINDOW = "from=2026-11-01&to=2027-01-31&today=2026-12-09";

describe.runIf(dbUp)("planned payments", () => {
	let me: Client;
	let bank: string;
	let xitique: string;
	let rent: string;
	let saving: string;
	let monthItem: string;

	const occurrences = async (paymentId: string) =>
		(
			(await me("GET", `/planned-payments/occurrences?${WINDOW}`)).body as {
				paymentId: string;
				dueDate: string;
				status: string;
			}[]
		).filter((o) => o.paymentId === paymentId);

	beforeAll(async () => {
		me = await signUp();
		bank = (
			await me("POST", "/accounts", {
				name: "BIM",
				type: "bank",
				initialBalance: 10_000_000,
			})
		).body.id;
		xitique = (
			await me("POST", "/accounts", {
				name: "Xitique (Poupança)",
				type: "savings",
				initialBalance: 0,
			})
		).body.id;
		await me("POST", "/budgets/plans", { year: 2026, expectedIncome: 0 });
		const plan = await me("POST", "/budgets/plans/2026/items", {
			name: "Renda",
			amount: 1_200_000,
		});
		expect(plan.status).toBeLessThan(300);
		await me("POST", "/budgets/plans/2026/generate");
		monthItem = (await me("GET", "/budgets/months/2026-11")).body.items.find(
			(i: { name: string }) => i.name === "Renda",
		).id;
	});

	afterAll(async () => {
		await db.delete(user).where(like(user.email, `${EMAIL_PREFIX}%`));
	});

	it("creates a monthly expense linked to a plan item", async () => {
		const planItemId = (
			await me("GET", "/budgets/months/2026-11")
		).body.items.find((i: { name: string }) => i.name === "Renda").planItemId;
		const r = await me("POST", "/planned-payments", {
			name: "Renda da casa",
			kind: "expense",
			amount: 1_200_000,
			accountId: bank,
			startDate: "2026-11-10",
			planItemId,
		});
		expect(r.status).toBe(201);
		expect(r.body).toMatchObject({
			frequency: "monthly",
			remindDays: 1,
			planItemName: "Renda",
		});
		rent = r.body.id;
	});

	it("lists due dates as overdue, due and scheduled", async () => {
		expect(await occurrences(rent)).toEqual([
			expect.objectContaining({ dueDate: "2026-11-10", status: "overdue" }),
			expect.objectContaining({ dueDate: "2026-12-10", status: "due" }),
			expect.objectContaining({ dueDate: "2027-01-10", status: "scheduled" }),
		]);
	});

	it("confirming creates the expense in the due month and pays the month item", async () => {
		const r = await me("POST", `/planned-payments/${rent}/confirm`, {
			dueDate: "2026-11-10",
			occurredAt: "2026-12-02T10:00:00.000Z",
		});
		expect(r.status).toBe(201);
		expect(r.body).toMatchObject({
			status: "paid",
			paidAmount: 1_200_000,
			monthItemId: monthItem,
		});
		const tx = (await me("GET", `/transactions/${r.body.transactionId}`)).body;
		expect(tx).toMatchObject({
			type: "expense",
			referenceMonth: "2026-11",
			monthItemId: monthItem,
			note: "Renda da casa",
		});
		const month = (await me("GET", "/budgets/months/2026-11")).body;
		expect(
			month.items.find((i: { id: string }) => i.id === monthItem).spent,
		).toBe(1_200_000);
	});

	it("refuses to confirm the same date twice or a date that is not due", async () => {
		expect(
			(
				await me("POST", `/planned-payments/${rent}/confirm`, {
					dueDate: "2026-11-10",
				})
			).status,
		).toBe(409);
		expect(
			(
				await me("POST", `/planned-payments/${rent}/confirm`, {
					dueDate: "2026-11-11",
				})
			).status,
		).toBe(422);
	});

	it("undo deletes the transaction", async () => {
		const before = (await occurrences(rent))[0] as unknown as {
			transactionId: string;
		};
		const r = await me(
			"DELETE",
			`/planned-payments/${rent}/occurrences/2026-11-10`,
		);
		expect(r.status).toBe(200);
		expect(
			(await me("GET", `/transactions/${before.transactionId}`)).status,
		).toBe(404);
		expect((await occurrences(rent))[0]?.status).toBe("overdue");
	});

	it("skipping marks the date as skipped", async () => {
		const r = await me("POST", `/planned-payments/${rent}/skip`, {
			dueDate: "2026-11-10",
		});
		expect(r.body.status).toBe("skipped");
	});

	it("deleting the transaction elsewhere makes the date unpaid again", async () => {
		const paid = (
			await me("POST", `/planned-payments/${rent}/confirm`, {
				dueDate: "2026-12-10",
			})
		).body;
		await me("DELETE", `/transactions/${paid.transactionId}`);
		expect((await occurrences(rent))[1]?.status).toBe("due");
	});

	it("Xitique is a monthly transfer into the savings account", async () => {
		const bad = await me("POST", "/planned-payments", {
			name: "Xitique",
			kind: "transfer",
			amount: 500_000,
			accountId: bank,
			startDate: "2026-12-12",
		});
		expect(bad.status).toBeGreaterThanOrEqual(400);
		saving = (
			await me("POST", "/planned-payments", {
				name: "Estique / Xitique",
				kind: "transfer",
				amount: 500_000,
				accountId: bank,
				toAccountId: xitique,
				startDate: "2026-12-12",
				remindDays: 3,
			})
		).body.id;
		const r = await me("POST", `/planned-payments/${saving}/confirm`, {
			dueDate: "2026-12-12",
		});
		expect(r.status).toBe(201);
		expect(r.body.transferId).toBeTruthy();
		const accounts = (await me("GET", "/accounts")).body as {
			id: string;
			balance: number;
		}[];
		expect(accounts.find((a) => a.id === xitique)?.balance).toBe(500_000);
	});

	it("reminders follow each payment's days before", async () => {
		const reminders = (
			await me("GET", "/planned-payments/reminders?today=2026-12-09")
		).body as { paymentId: string; dueDate: string; title: string }[];
		expect(reminders).toEqual([
			expect.objectContaining({
				paymentId: rent,
				dueDate: "2026-12-10",
				title: "Renda da casa vence amanhã",
			}),
		]);
		const earlier = (
			await me("GET", "/planned-payments/reminders?today=2026-12-07")
		).body;
		expect(earlier).toEqual([]);
	});

	it("deleting a payment keeps its transactions", async () => {
		const paid = (
			await me("POST", `/planned-payments/${rent}/confirm`, {
				dueDate: "2026-12-10",
			})
		).body;
		expect((await me("DELETE", `/planned-payments/${rent}`)).status).toBe(204);
		expect(
			(await me("GET", `/transactions/${paid.transactionId}`)).status,
		).toBe(200);
	});
});
