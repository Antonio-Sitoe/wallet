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
const EMAIL_PREFIX = `e2e-offline-${Date.now()}`;

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
			name: "E2E offline",
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

describe.runIf(dbUp)("idempotent writes for offline sync", () => {
	let me: Client;
	let bank: string;
	let cash: string;

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
	});

	afterAll(async () => {
		await db.delete(user).where(like(user.email, `${EMAIL_PREFIX}%`));
	});

	const balanceOf = async (accountId: string) =>
		(await me("GET", `/accounts/${accountId}`)).body.balance;

	it("creating without id still works as before", async () => {
		const r = await me("POST", "/transactions", {
			accountId: bank,
			type: "expense",
			amount: 1_000,
			occurredAt: "2026-11-10T10:00:00.000Z",
		});
		expect(r.status).toBe(201);
		expect(r.body.id).toEqual(expect.any(String));
	});

	it("repeating a transaction POST with the same id does not duplicate", async () => {
		const id = crypto.randomUUID();
		const body = {
			id,
			accountId: bank,
			type: "expense",
			amount: 2_500,
			occurredAt: "2026-11-11T10:00:00.000Z",
		};
		const before = await balanceOf(bank);
		const first = await me("POST", "/transactions", body);
		const second = await me("POST", "/transactions", body);
		expect(first.status).toBe(201);
		expect(first.body.id).toBe(id);
		expect(second.body.id).toBe(id);
		expect(await balanceOf(bank)).toBe(before - 2_500);
	});

	it("repeating a transfer POST with the same id does not duplicate", async () => {
		const id = crypto.randomUUID();
		const body = {
			id,
			fromAccountId: bank,
			toAccountId: cash,
			amount: 5_000,
			occurredAt: "2026-11-12T10:00:00.000Z",
		};
		const before = await balanceOf(cash);
		const first = await me("POST", "/transfers", body);
		const second = await me("POST", "/transfers", body);
		expect(first.status).toBe(201);
		expect(first.body.id).toBe(id);
		expect(second.body.id).toBe(id);
		expect(await balanceOf(cash)).toBe(before + 5_000);
	});

	it("deleting a transaction twice succeeds both times", async () => {
		const created = await me("POST", "/transactions", {
			accountId: cash,
			type: "income",
			amount: 700,
			occurredAt: "2026-11-13T10:00:00.000Z",
		});
		const first = await me("DELETE", `/transactions/${created.body.id}`);
		const second = await me("DELETE", `/transactions/${created.body.id}`);
		expect(first.status).toBe(204);
		expect(second.status).toBe(204);
		const get = await me("GET", `/transactions/${created.body.id}`);
		expect(get.status).toBe(404);
	});

	it("deleting a transfer twice succeeds both times", async () => {
		const created = await me("POST", "/transfers", {
			fromAccountId: cash,
			toAccountId: bank,
			amount: 300,
			occurredAt: "2026-11-14T10:00:00.000Z",
		});
		const first = await me("DELETE", `/transfers/${created.body.id}`);
		const second = await me("DELETE", `/transfers/${created.body.id}`);
		expect(first.status).toBe(204);
		expect(second.status).toBe(204);
	});

	it("updating a transaction ignores an id in the body", async () => {
		const created = await me("POST", "/transactions", {
			accountId: bank,
			type: "expense",
			amount: 900,
			occurredAt: "2026-11-15T10:00:00.000Z",
		});
		const r = await me("PATCH", `/transactions/${created.body.id}`, {
			id: crypto.randomUUID(),
			amount: 950,
		});
		expect(r.status).toBe(200);
		expect(r.body.id).toBe(created.body.id);
		expect(r.body.amount).toBe(-950);
	});
});
