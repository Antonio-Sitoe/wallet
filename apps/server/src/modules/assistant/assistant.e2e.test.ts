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
const EMAIL_PREFIX = `e2e-assistente-${Date.now()}`;

const dbUp = await db
	.execute(sql`select 1`)
	.then(() => true)
	.catch(() => false);

type Res = { status: number; body: any; headers: Record<string, unknown> };
type Client = (method: string, url: string, body?: unknown) => Promise<Res>;

async function signUp(suffix: string): Promise<Client> {
	const res = await app.inject({
		method: "POST",
		url: "/api/auth/sign-up/email",
		headers: { origin: "http://localhost:3001" },
		payload: {
			email: `${EMAIL_PREFIX}-${suffix}@example.test`,
			password: "e2e-password-123",
			name: "E2E assistente",
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
		const json = (r.headers["content-type"] ?? "").toString().includes("json");
		return {
			status: r.statusCode,
			body: json && r.body ? JSON.parse(r.body) : r.body,
			headers: r.headers,
		};
	};
}

describe.runIf(dbUp)("search and assistant", () => {
	let me: Client;
	let other: Client;

	beforeAll(async () => {
		me = await signUp("main");
		other = await signUp("other");
		const bank = (
			await me("POST", "/accounts", {
				name: "Banco Íntegro",
				type: "bank",
				initialBalance: 500_000,
			})
		).body.id;
		await me("POST", "/transactions", {
			type: "expense",
			accountId: bank,
			amount: 2500,
			occurredAt: "2026-11-10T10:00:00Z",
			payee: "Mercearia Sarita",
		});
	});

	afterAll(async () => {
		await db.delete(user).where(like(user.email, `${EMAIL_PREFIX}%`));
	});

	it("finds accounts without accents and transactions by payee", async () => {
		const accounts = await me("GET", "/search?q=integro");
		expect(accounts.status).toBe(200);
		expect(accounts.body.accounts).toEqual([
			expect.objectContaining({ title: "Banco Íntegro", amount: 497_500 }),
		]);

		const found = await me("GET", "/search?q=sarita&scope=transactions");
		expect(found.body.accounts).toEqual([]);
		expect(found.body.transactions).toEqual([
			expect.objectContaining({
				title: "Mercearia Sarita",
				amount: -2500,
				subtitle: "Banco Íntegro · 2026-11-10",
			}),
		]);
	});

	it("reports that no model is connected yet", async () => {
		const r = await me("GET", "/assistant/status");
		expect(r.body).toEqual({ connected: false, provider: null });
	});

	it("keeps a conversation with the question and a placeholder answer", async () => {
		const created = await me("POST", "/assistant/conversations", {});
		expect(created.status).toBe(201);
		expect(created.body.title).toBe("Nova conversa");
		const id = created.body.id;

		const sent = await me("POST", `/assistant/conversations/${id}/messages`, {
			content: "Quanto gastei em transporte este mês?",
		});
		expect(sent.status).toBe(201);
		expect(sent.body.messages.map((m: { role: string }) => m.role)).toEqual([
			"user",
			"assistant",
		]);
		expect(sent.body.conversation.title).toBe(
			"Quanto gastei em transporte este mês?",
		);

		const detail = await me("GET", `/assistant/conversations/${id}`);
		expect(detail.body.messages).toHaveLength(2);
		expect(detail.body.messages[0].content).toBe(
			"Quanto gastei em transporte este mês?",
		);

		const pinned = await me("PATCH", `/assistant/conversations/${id}`, {
			pinned: true,
		});
		expect(pinned.body.pinned).toBe(true);

		const listed = await me("GET", "/assistant/conversations?q=transporte");
		expect(listed.body.map((c: { id: string }) => c.id)).toEqual([id]);
		expect(listed.body[0].preview).toBeTruthy();

		const exported = await me("GET", `/assistant/conversations/${id}/export`);
		expect(exported.status).toBe(200);
		expect(String(exported.headers["content-disposition"])).toContain(
			"quanto-gastei-em-transporte-este-mes.md",
		);
		expect(exported.body).toContain("**Eu**");

		expect((await other("GET", `/assistant/conversations/${id}`)).status).toBe(
			404,
		);
		expect((await me("DELETE", `/assistant/conversations/${id}`)).status).toBe(
			204,
		);
		expect((await me("GET", "/assistant/conversations")).body).toEqual([]);
	});
});
