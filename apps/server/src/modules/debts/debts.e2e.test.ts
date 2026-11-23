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
const EMAIL_PREFIX = `e2e-dividas-${Date.now()}`;

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
			name: "E2E dívidas",
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

describe.runIf(dbUp)("debts", () => {
	let me: Client;
	let bank: string;
	let edilson: string;

	beforeAll(async () => {
		me = await signUp();
		bank = (
			await me("POST", "/accounts", {
				name: "Banco",
				type: "bank",
				initialBalance: 5_000_000,
			})
		).body.id;
		await me("GET", "/categories");
		const note = async (
			type: "income" | "expense",
			amount: number,
			text: string,
		) =>
			me("POST", "/transactions", {
				type,
				accountId: bank,
				amount,
				occurredAt: "2026-06-10T10:00:00.000Z",
				note: text,
			});
		await note("expense", 300_000, "Eu → Délcio");
		await note("income", 250_000, "Délcio → Eu");
		await note("expense", 100_000, "Me → Edilson");
		await note("income", 50_000, "Edilson → Eu : escola");
	});

	afterAll(async () => {
		await db.delete(user).where(like(user.email, `${EMAIL_PREFIX}%`));
	});

	it("creates a debt someone owes me", async () => {
		const r = await me("POST", "/debts", {
			person: "Edilson Sitoe",
			direction: "owed_to_me",
			amount: 2_000_000,
		});
		expect(r.status).toBe(201);
		expect(r.body).toMatchObject({ paid: 0, payments: [] });
		edilson = r.body.id;
	});

	it("a partial repayment is an income in Dívidas › Recebidas", async () => {
		const r = await me("POST", `/debts/${edilson}/payments`, {
			amount: 500_000,
			accountId: bank,
		});
		expect(r.status).toBe(201);
		expect(r.body.paid).toBe(500_000);
		const tx = (
			await me("GET", `/transactions/${r.body.payments[0].transactionId}`)
		).body;
		expect(tx.type).toBe("income");
		expect(tx.amount).toBe(500_000);
		const cats = (await me("GET", "/categories")).body as {
			id: string;
			name: string;
			parentId: string | null;
		}[];
		const category = cats.find((c) => c.id === tx.categoryId)!;
		expect(category.name).toBe("Recebidas");
		expect(cats.find((c) => c.id === category.parentId)?.name).toBe("Dívidas");
	});

	it("refuses to receive more than what is missing", async () => {
		const r = await me("POST", `/debts/${edilson}/payments`, {
			amount: 1_600_000,
			accountId: bank,
		});
		expect(r.status).toBe(422);
	});

	it("removing a payment deletes its transaction", async () => {
		const debt = (await me("GET", `/debts/${edilson}`)).body;
		const txId = debt.payments[0].transactionId;
		const r = await me("DELETE", `/debts/${edilson}/payments/${txId}`);
		expect(r.body.paid).toBe(0);
		expect((await me("GET", `/transactions/${txId}`)).status).toBe(404);
	});

	it("paying what I owe is an expense", async () => {
		const owe = (
			await me("POST", "/debts", {
				person: "Edi",
				direction: "i_owe",
				amount: 200_000,
			})
		).body;
		const r = await me("POST", `/debts/${owe.id}/payments`, {
			amount: 200_000,
			accountId: bank,
		});
		const tx = (
			await me("GET", `/transactions/${r.body.payments[0].transactionId}`)
		).body;
		expect(tx.type).toBe("expense");
		expect(tx.amount).toBe(-200_000);
	});

	it("suggests people from the Wallet notes, hiding existing debts", async () => {
		const s = (await me("GET", "/debts/suggestions")).body as {
			key: string;
			direction: string;
			net: number;
		}[];
		expect(s.map((x) => x.key)).toEqual(["delcio"]);
		expect(s[0]).toMatchObject({ direction: "owed_to_me", net: 50_000 });
	});

	it("an ignored suggestion stays hidden", async () => {
		const r = await me("POST", "/debts/suggestions/delcio/ignore");
		expect(r.status).toBe(204);
		expect((await me("GET", "/debts/suggestions")).body).toEqual([]);
	});

	it("deleting a debt keeps its payments as plain transactions", async () => {
		const owe = (await me("GET", "/debts")).body.find(
			(d: { person: string }) => d.person === "Edi",
		);
		const txId = owe.payments[0].transactionId;
		expect((await me("DELETE", `/debts/${owe.id}`)).status).toBe(204);
		expect((await me("GET", `/transactions/${txId}`)).status).toBe(200);
	});
});
