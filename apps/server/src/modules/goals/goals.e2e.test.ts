import { user } from "@wallet/db/schema/auth";
import { yearMonthOf } from "@wallet/shared";
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
const EMAIL_PREFIX = `e2e-metas-${Date.now()}`;

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
			name: "E2E metas",
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

describe.runIf(dbUp)("goals", () => {
	let me: Client;
	let bank: string;
	let savings: string;
	let obra: string;

	beforeAll(async () => {
		me = await signUp();
		bank = (
			await me("POST", "/accounts", {
				name: "Banco",
				type: "bank",
				initialBalance: 10_000_000,
			})
		).body.id;
		savings = (
			await me("POST", "/accounts", { name: "Poupança", type: "savings" })
		).body.id;
	});

	afterAll(async () => {
		await db.delete(user).where(like(user.email, `${EMAIL_PREFIX}%`));
	});

	it("creates a goal that starts from an imported amount", async () => {
		const r = await me("POST", "/goals", {
			name: "Obra",
			target: 5_000_000,
			startingAmount: 2_700_000,
			accountId: savings,
		});
		expect(r.status).toBe(201);
		expect(r.body.saved).toBe(2_700_000);
		expect(r.body.contributions).toHaveLength(0);
		obra = r.body.id;
	});

	it("a contribution is a transfer into the goal account", async () => {
		const r = await me("POST", `/goals/${obra}/contribute`, {
			fromAccountId: bank,
			amount: 500_000,
		});
		expect(r.status).toBe(201);
		expect(r.body.saved).toBe(3_200_000);
		expect(r.body.contributions).toHaveLength(1);
		expect(r.body.contributions[0].viaMonthItem).toBe(false);
		const accounts = (await me("GET", "/accounts")).body as {
			id: string;
			balance: number;
		}[];
		expect(accounts.find((a) => a.id === savings)!.balance).toBe(500_000);
		expect(accounts.find((a) => a.id === bank)!.balance).toBe(9_500_000);
	});

	it("refuses a contribution from the goal account itself", async () => {
		const r = await me("POST", `/goals/${obra}/contribute`, {
			fromAccountId: savings,
			amount: 1_000,
		});
		expect(r.status).toBe(422);
	});

	it("other transfers into the same account do not count", async () => {
		await me("POST", "/transfers", {
			fromAccountId: bank,
			toAccountId: savings,
			amount: 100_000,
			occurredAt: new Date().toISOString(),
		});
		const r = await me("GET", `/goals/${obra}`);
		expect(r.body.saved).toBe(3_200_000);
	});

	it("parts are added, marked paid and removed", async () => {
		const added = await me("POST", `/goals/${obra}/parts`, {
			name: "Fossa",
			amount: 1_550_000,
		});
		expect(added.status).toBe(201);
		const part = added.body.parts[0];
		expect(part.paid).toBe(false);
		const paid = await me("PATCH", `/goal-parts/${part.id}`, { paid: true });
		expect(paid.body.parts[0].paid).toBe(true);
		const renamed = await me("PATCH", `/goal-parts/${part.id}`, {
			name: "Fossa séptica",
		});
		expect(renamed.body.parts[0].paid).toBe(true);
		const removed = await me("DELETE", `/goal-parts/${part.id}`);
		expect(removed.body.parts).toHaveLength(0);
	});

	it("linking to the plan needs a plan for the year", async () => {
		const r = await me("POST", "/goals", {
			name: "Emergência",
			target: 26_850_000,
			accountId: savings,
			monthlyContribution: 500_000,
			addToPlan: true,
		});
		expect(r.status).toBe(422);
		expect(r.body.code ?? r.body.error?.code).toBe("NO_PLAN");
	});

	it("paying the linked item from the month list counts for the goal", async () => {
		const month = yearMonthOf(new Date());
		const year = Number(month.slice(0, 4));
		await me("POST", "/budgets/plans", { year });
		const created = await me("POST", "/goals", {
			name: "Emergência",
			target: 26_850_000,
			accountId: savings,
			monthlyContribution: 500_000,
			addToPlan: true,
		});
		expect(created.status).toBe(201);
		expect(created.body.plan.amount).toBe(500_000);
		await me("POST", `/budgets/plans/${year}/generate`);

		const list = (await me("GET", `/budgets/months/${month}`)).body;
		const item = list.items.find(
			(i: { planItemId: string | null }) =>
				i.planItemId === created.body.plan.id,
		);
		expect(item).toBeDefined();
		await me("POST", `/budgets/month-items/${item.id}/payments`, {
			accountId: bank,
			amount: 500_000,
		});
		const goal = await me("GET", `/goals/${created.body.id}`);
		expect(goal.body.saved).toBe(500_000);
		expect(goal.body.contributions[0].viaMonthItem).toBe(true);
	});

	it("deleting a goal keeps the transfers", async () => {
		const before = (await me("GET", "/transactions?type=transfer")).body.items
			.length;
		const r = await me("DELETE", `/goals/${obra}`);
		expect(r.status).toBe(204);
		const after = (await me("GET", "/transactions?type=transfer")).body.items
			.length;
		expect(after).toBe(before);
	});

	it("an empty account used by a goal cannot be deleted", async () => {
		const empty = (
			await me("POST", "/accounts", { name: "Carteira meta", type: "cash" })
		).body.id;
		await me("POST", "/goals", {
			name: "Meta na carteira",
			target: 100_000,
			accountId: empty,
		});
		const r = await me("DELETE", `/accounts/${empty}`);
		expect(r.status).toBe(409);
		expect(r.body.code ?? r.body.error?.code).toBe("ACCOUNT_IN_USE");
	});
});
