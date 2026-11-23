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
const EMAIL_PREFIX = `e2e-pessoas-${Date.now()}`;

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
			name: "E2E pessoas",
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

const query = "from=2026-11-01&to=2026-11-30&flow=expense";

describe.runIf(dbUp)("statistics by person and label", () => {
	let me: Client;
	let bank: string;
	let tagged: string;

	beforeAll(async () => {
		me = await signUp();
		bank = (
			await me("POST", "/accounts", {
				name: "Banco",
				type: "bank",
				initialBalance: 1_000_000,
			})
		).body.id;
		const spend = (
			amount: number,
			payee: string | null,
			labels: string[] | undefined,
		) =>
			me("POST", "/transactions", {
				type: "expense",
				accountId: bank,
				amount,
				occurredAt: "2026-11-10T10:00:00Z",
				payee,
				labels,
			});
		tagged = (await spend(3000, "Sarita", ["Obra", "Obra", "Casamento"])).body
			.id;
		await spend(6000, " sarita ", undefined);
		await spend(1000, "Auzenda", ["Obra"]);
		await spend(500, null, undefined);
	});

	afterAll(async () => {
		await db.delete(user).where(like(user.email, `${EMAIL_PREFIX}%`));
	});

	it("stores labels without repeats", async () => {
		const r = await me("GET", `/transactions/${tagged}`);
		expect(r.status).toBe(200);
		expect(r.body.labels).toEqual(["Obra", "Casamento"]);
	});

	it("filters transactions by label", async () => {
		const r = await me("GET", "/transactions?label=Obra");
		expect(r.body.items.map((t: { amount: number }) => t.amount)).toEqual(
			expect.arrayContaining([-3000, -1000]),
		);
		expect(r.body.items).toHaveLength(2);
	});

	it("lists labels by use", async () => {
		const r = await me("GET", "/transactions/labels");
		expect(r.body).toEqual([
			{ name: "Obra", count: 2 },
			{ name: "Casamento", count: 1 },
		]);
	});

	it("sums spending per person, ignoring case and spaces", async () => {
		const r = await me("GET", `/analytics/breakdown?${query}&by=payee`);
		expect(r.status).toBe(200);
		expect(r.body.total).toBe(10000);
		expect(
			r.body.items.map((i: { name: string; value: number }) => [
				i.name,
				i.value,
			]),
		).toEqual([
			["Sarita", 9000],
			["Auzenda", 1000],
		]);
	});

	it("sums spending per label", async () => {
		const r = await me("GET", `/analytics/breakdown?${query}&by=label`);
		expect(
			r.body.items.map((i: { name: string; value: number }) => [
				i.name,
				i.value,
			]),
		).toEqual([
			["Obra", 4000],
			["Casamento", 3000],
		]);
	});

	it("changes labels on update", async () => {
		const r = await me("PATCH", `/transactions/${tagged}`, {
			labels: ["Festa"],
		});
		expect(r.body.labels).toEqual(["Festa"]);
	});
});
