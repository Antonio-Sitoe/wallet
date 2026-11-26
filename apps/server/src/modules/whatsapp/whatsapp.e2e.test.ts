import { user } from "@wallet/db/schema/auth";
import { transactions } from "@wallet/db/schema/transactions";
import {
	whatsappInbox,
	whatsappUnknownReplies,
} from "@wallet/db/schema/whatsapp";
import { inArray, like, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../../app";
import { auth, db } from "../../infrastructure/services";

const SECRET = "e2e-whatsapp-secret-0123456789abcdef";
const sent: { phone: string; text: string }[] = [];
const app = buildApp({
	db,
	auth,
	corsOrigins: ["http://localhost:3001"],
	logger: false,
	whatsapp: {
		sender: {
			sendText: async (phone, text) => {
				sent.push({ phone, text });
			},
		},
		botNumber: "258833204038",
		webhookSecret: SECRET,
	},
});
const RUN = `${Date.now()}`;
const EMAIL_PREFIX = `e2e-whatsapp-${RUN}`;
const phoneOf = (n: number) => `25884${RUN.slice(-6)}${n}`;
const PHONE_A = phoneOf(1);
const PHONE_B = phoneOf(2);
const PHONE_C = phoneOf(3);
const PHONE_UNKNOWN = phoneOf(9);
const messageIds: string[] = [];

const dbUp = await db
	.execute(sql`select 1`)
	.then(() => true)
	.catch(() => false);

type Res = { status: number; body: any };
type Client = (method: string, url: string, body?: unknown) => Promise<Res>;

async function signUp(name: string): Promise<Client> {
	const res = await app.inject({
		method: "POST",
		url: "/api/auth/sign-up/email",
		headers: { origin: "http://localhost:3001" },
		payload: {
			email: `${EMAIL_PREFIX}-${name}@example.test`,
			password: "e2e-password-123",
			name,
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

const lastTo = (phone: string) =>
	[...sent].reverse().find((message) => message.phone === phone)?.text ?? "";
const codeFor = (phone: string) =>
	lastTo(phone).match(/Código Wallet: (\d{6})/)?.[1] ?? "";

let counter = 0;
async function incoming(
	phone: string,
	text: string,
	options: { id?: string; secret?: string | null } = {},
) {
	const id = options.id ?? `E2E-${RUN}-${++counter}`;
	messageIds.push(id);
	const secret = options.secret === undefined ? SECRET : options.secret;
	return app.inject({
		method: "POST",
		url: "/webhooks/whatsapp",
		headers: secret === null ? {} : { "x-wallet-secret": secret },
		payload: {
			event: "messages.upsert",
			data: {
				key: { id, remoteJid: `${phone}@s.whatsapp.net`, fromMe: false },
				message: { conversation: text },
			},
		},
	});
}

describe.runIf(dbUp)("whatsapp link and webhook", () => {
	let alice: Client;
	let bob: Client;
	let carol: Client;
	let aliceCash: string;

	beforeAll(async () => {
		alice = await signUp("alice");
		bob = await signUp("bob");
		carol = await signUp("carol");
		aliceCash = (
			await alice("POST", "/accounts", { name: "Caixa Alice", type: "cash" })
		).body.id;
		await bob("POST", "/accounts", { name: "Caixa Bob", type: "cash" });
	});

	afterAll(async () => {
		await db.delete(user).where(like(user.email, `${EMAIL_PREFIX}%`));
		if (messageIds.length)
			await db
				.delete(whatsappInbox)
				.where(inArray(whatsappInbox.messageId, messageIds));
		await db
			.delete(whatsappUnknownReplies)
			.where(
				inArray(whatsappUnknownReplies.phone, [
					PHONE_A,
					PHONE_B,
					PHONE_C,
					PHONE_UNKNOWN,
				]),
			);
		await app.close();
	});

	it("starts unlinked and shows the bot number", async () => {
		const res = await alice("GET", "/whatsapp");
		expect(res.body).toEqual({
			enabled: true,
			botNumber: "258833204038",
			phone: null,
			verified: false,
			codeExpiresAt: null,
		});
	});

	it("rejects an invalid number", async () => {
		expect((await alice("POST", "/whatsapp/link", { phone: "123" })).status).toBe(
			400,
		);
	});

	it("sends a code, limits resends and verifies it", async () => {
		const local = PHONE_A.slice(3);
		const link = await alice("POST", "/whatsapp/link", { phone: local });
		expect(link.status).toBe(200);
		expect(link.body).toMatchObject({ phone: PHONE_A, verified: false });
		expect(link.body.codeExpiresAt).toBeTruthy();
		const code = codeFor(PHONE_A);
		expect(code).toMatch(/^\d{6}$/);

		expect(
			(await alice("POST", "/whatsapp/link", { phone: PHONE_A })).status,
		).toBe(429);

		const wrong = code === "000000" ? "111111" : "000000";
		expect(
			(await alice("POST", "/whatsapp/verify", { code: wrong })).status,
		).toBe(422);
		const ok = await alice("POST", "/whatsapp/verify", { code });
		expect(ok.status).toBe(200);
		expect(ok.body).toMatchObject({ phone: PHONE_A, verified: true });
		expect(lastTo(PHONE_A)).toContain("Número ligado");
	});

	it("does not let another account take a verified number", async () => {
		expect(
			(await bob("POST", "/whatsapp/link", { phone: PHONE_A })).status,
		).toBe(409);
	});

	it("locks the code after five wrong attempts", async () => {
		await carol("POST", "/whatsapp/link", { phone: PHONE_C });
		const code = codeFor(PHONE_C);
		const wrong = code === "000000" ? "111111" : "000000";
		for (let i = 0; i < 5; i++)
			expect(
				(await carol("POST", "/whatsapp/verify", { code: wrong })).status,
			).toBe(422);
		expect(
			(await carol("POST", "/whatsapp/verify", { code })).status,
		).toBe(429);
	});

	it("refuses webhooks without the secret", async () => {
		expect((await incoming(PHONE_A, "saldo", { secret: null })).statusCode).toBe(
			401,
		);
		expect(
			(await incoming(PHONE_A, "saldo", { secret: "wrong" })).statusCode,
		).toBe(401);
	});

	it("answers balances and records in the sender's own account", async () => {
		await bob("POST", "/whatsapp/link", { phone: PHONE_B });
		await bob("POST", "/whatsapp/verify", { code: codeFor(PHONE_B) });

		expect((await incoming(PHONE_A, "saldo")).statusCode).toBe(200);
		expect(lastTo(PHONE_A)).toContain("Caixa Alice");
		expect(lastTo(PHONE_A)).not.toContain("Caixa Bob");

		await incoming(PHONE_B, "saldo");
		expect(lastTo(PHONE_B)).toContain("Caixa Bob");
		expect(lastTo(PHONE_B)).not.toContain("Caixa Alice");

		const before = sent.length;
		await incoming(PHONE_A, "- 12 caixa teste", { id: `E2E-${RUN}-dup` });
		await incoming(PHONE_A, "- 12 caixa teste", { id: `E2E-${RUN}-dup` });
		expect(sent.length).toBe(before + 1);
		expect(lastTo(PHONE_A)).toContain("✅ Saída 12,00 MZN · Caixa Alice");
		const rows = await db
			.select({ id: transactions.id })
			.from(transactions)
			.where(inArray(transactions.accountId, [aliceCash]));
		expect(rows.length).toBe(1);
	});

	it("answers an unknown number once a day", async () => {
		const before = sent.length;
		await incoming(PHONE_UNKNOWN, "saldo");
		await incoming(PHONE_UNKNOWN, "saldo");
		expect(sent.length).toBe(before + 1);
		expect(lastTo(PHONE_UNKNOWN)).toContain("não está ligado");
	});

	it("stays quiet on plain text", async () => {
		const before = sent.length;
		await incoming(PHONE_A, "olá, só uma nota");
		expect(sent.length).toBe(before);
	});

	it("unlinks the number", async () => {
		const res = await alice("DELETE", "/whatsapp");
		expect(res.status).toBe(204);
		expect((await alice("GET", "/whatsapp")).body).toMatchObject({
			phone: null,
			verified: false,
		});
	});
});
