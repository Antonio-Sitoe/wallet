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
const EMAIL_PREFIX = `e2e-acertos-${Date.now()}`;

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
			name: "E2E acertos",
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

describe.runIf(dbUp)("acertos and starting over", () => {
	let me: Client;
	let bank: string;
	let cash: string;
	let food: string;

	beforeAll(async () => {
		me = await signUp();
		bank = (
			await me("POST", "/accounts", {
				name: "Banco",
				type: "bank",
				initialBalance: 100_000,
			})
		).body.id;
		cash = (await me("POST", "/accounts", { name: "Caixa", type: "cash" })).body
			.id;
		const cats = (await me("GET", "/categories")).body as {
			id: string;
			kind: string;
			isSystem: boolean;
		}[];
		food = cats.find((c) => c.kind === "expense" && !c.isSystem)!.id;
		await me("POST", "/transactions", {
			accountId: bank,
			categoryId: food,
			type: "expense",
			amount: 30_000,
			occurredAt: "2026-11-10T10:00:00.000Z",
		});
	});

	afterAll(async () => {
		await db.delete(user).where(like(user.email, `${EMAIL_PREFIX}%`));
	});

	it("reconcile adds an Acerto and keeps the initial balance", async () => {
		const r = await me("POST", `/accounts/${bank}/reconcile`, {
			balance: 50_000,
		});
		expect(r.status).toBe(200);
		expect(r.body.balance).toBe(50_000);
		expect(r.body.initialBalance).toBe(100_000);
		const list = await me("GET", "/transactions?type=adjustment");
		expect(list.body.items).toHaveLength(1);
		expect(list.body.items[0].amount).toBe(-20_000);
	});

	it("reconcile to the same balance adds nothing", async () => {
		await me("POST", `/accounts/${bank}/reconcile`, { balance: 50_000 });
		const list = await me("GET", "/transactions?type=adjustment");
		expect(list.body.items).toHaveLength(1);
	});

	it("an Acerto is not edited", async () => {
		const list = await me("GET", "/transactions?type=adjustment");
		const r = await me("PATCH", `/transactions/${list.body.items[0].id}`, {
			note: "x",
		});
		expect(r.status).toBe(409);
		expect(r.body.code ?? r.body.error?.code).toBe("IS_ADJUSTMENT");
	});

	it("acertos are neither income nor expense in the analytics", async () => {
		const r = await me(
			"GET",
			"/analytics/overview?from=2026-11-01&to=2026-11-30",
		);
		expect(r.status).toBe(200);
		expect(r.body.expense).toBe(30_000);
		expect(r.body.income).toBe(0);
	});

	it("zero-balances brings every active account to 0 and keeps the history", async () => {
		await me("POST", "/transactions", {
			accountId: cash,
			categoryId: food,
			type: "expense",
			amount: 1_000,
			occurredAt: "2026-11-11T10:00:00.000Z",
		});
		const r = await me("POST", "/accounts/zero-balances", {});
		expect(r.status).toBe(200);
		expect(r.body.map((a: { balance: number }) => a.balance)).toEqual([0, 0]);
		const expenses = await me("GET", "/transactions?type=expense");
		expect(expenses.body.items).toHaveLength(2);
	});

	it("reset needs the confirmation word", async () => {
		const r = await me("POST", "/accounts/reset", { confirm: "sim" });
		expect(r.status).toBe(400);
	});

	it("reset deletes the money history and zeroes initial balances", async () => {
		const r = await me("POST", "/accounts/reset", { confirm: "APAGAR" });
		expect(r.status).toBe(200);
		expect(r.body.removed.transactions).toBeGreaterThan(0);
		const tx = await me("GET", "/transactions");
		expect(tx.body.items).toHaveLength(0);
		const accounts = (await me("GET", "/accounts")).body;
		expect(accounts).toHaveLength(2);
		for (const a of accounts) {
			expect(a.balance).toBe(0);
			expect(a.initialBalance).toBe(0);
		}
	});
});
