import { user } from "@wallet/db/schema/auth";
import { eq, like, sql } from "drizzle-orm";
import { unzipSync } from "fflate";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../../app";
import { auth, db } from "../../infrastructure/services";

const app = buildApp({
	db,
	auth,
	corsOrigins: ["http://localhost:3001"],
	logger: false,
});
const EMAIL_PREFIX = `e2e-definicoes-${Date.now()}`;

const dbUp = await db
	.execute(sql`select 1`)
	.then(() => true)
	.catch(() => false);

type Res = { status: number; body: any; raw: Buffer; headers: any };
type Client = (method: string, url: string, body?: unknown) => Promise<Res>;

async function signUp(suffix: string): Promise<Client> {
	const res = await app.inject({
		method: "POST",
		url: "/api/auth/sign-up/email",
		headers: { origin: "http://localhost:3001" },
		payload: {
			email: `${EMAIL_PREFIX}-${suffix}@example.test`,
			password: "e2e-password-123",
			name: "E2E definições",
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
			raw: r.rawPayload,
			headers: r.headers,
		};
	};
}

describe.runIf(dbUp)("settings", () => {
	let me: Client;
	let bank: string;
	let cash: string;

	beforeAll(async () => {
		me = await signUp("main");
		bank = (
			await me("POST", "/accounts", {
				name: "Banco",
				type: "bank",
				initialBalance: 1_000_000,
			})
		).body.id;
		cash = (await me("POST", "/accounts", { name: "Numerário", type: "cash" }))
			.body.id;
	});

	afterAll(async () => {
		await db.delete(user).where(like(user.email, `${EMAIL_PREFIX}%`));
	});

	it("starts with default preferences", async () => {
		const r = await me("GET", "/settings/preferences");
		expect(r.status).toBe(200);
		expect(r.body).toMatchObject({
			theme: "system",
			hideMoney: false,
			density: "compact",
			numberFormat: "space",
			confirmOnCheck: "always",
			salaryAccountId: null,
			hasPin: false,
		});
		expect(r.body.notifications.upcomingPayments).toBe(true);
	});

	it("updates preferences and merges notifications", async () => {
		const r = await me("PATCH", "/settings/preferences", {
			theme: "dark",
			hideMoney: true,
			salaryAccountId: bank,
			notifications: { monthSummary: true },
		});
		expect(r.status).toBe(200);
		expect(r.body).toMatchObject({
			theme: "dark",
			hideMoney: true,
			salaryAccountId: bank,
		});
		expect(r.body.notifications).toMatchObject({
			monthSummary: true,
			upcomingPayments: true,
		});
	});

	it("refuses another user's account as salary account", async () => {
		const other = await signUp("other");
		const foreign = (
			await other("POST", "/accounts", { name: "Alheia", type: "bank" })
		).body.id;
		const r = await me("PATCH", "/settings/preferences", {
			salaryAccountId: foreign,
		});
		expect(r.status).toBe(422);
	});

	it("sets a PIN, locks after five wrong tries", async () => {
		expect(
			(await me("PUT", "/settings/pin", { pin: "1234" })).body.hasPin,
		).toBe(true);
		expect(
			(await me("POST", "/settings/pin/verify", { pin: "1234" })).body.ok,
		).toBe(true);
		let last: Res | undefined;
		for (let i = 0; i < 5; i++)
			last = await me("POST", "/settings/pin/verify", { pin: "0000" });
		expect(last?.body.ok).toBe(false);
		expect(last?.body.lockedUntil).toBeTruthy();
		const locked = await me("POST", "/settings/pin/verify", { pin: "1234" });
		expect(locked.body.ok).toBe(false);
		expect(locked.body.attemptsLeft).toBe(0);
	});

	it("keeps the PIN hashed in the database", async () => {
		const { rows } = await db.execute<{ pin_hash: string }>(
			sql`select pin_hash from user_preferences up join "user" u on u.id = up.user_id where u.email = ${`${EMAIL_PREFIX}-main@example.test`}`,
		);
		expect(rows[0]?.pin_hash.startsWith("scrypt$")).toBe(true);
		expect(rows[0]?.pin_hash).not.toContain("1234");
	});

	it("creates, edits, reorders and deletes templates", async () => {
		const ride = await me("POST", "/settings/templates", {
			name: "Transporte 100",
			type: "expense",
			amount: 10_000,
			accountId: cash,
		});
		expect(ride.status).toBe(201);
		const saving = await me("POST", "/settings/templates", {
			name: "Xitique",
			type: "transfer",
			accountId: bank,
			toAccountId: cash,
		});
		expect(saving.body.position).toBe(1);

		const same = await me("POST", "/settings/templates", {
			name: "Mal",
			type: "transfer",
			accountId: bank,
			toAccountId: bank,
		});
		expect(same.status).toBe(422);

		const edited = await me("PATCH", `/settings/templates/${ride.body.id}`, {
			amount: 5_000,
		});
		expect(edited.body.amount).toBe(5_000);

		const order = await me("PUT", "/settings/templates/order", {
			ids: [saving.body.id, ride.body.id],
		});
		expect(order.body.map((t: { name: string }) => t.name)).toEqual([
			"Xitique",
			"Transporte 100",
		]);

		expect(
			(await me("DELETE", `/settings/templates/${saving.body.id}`)).status,
		).toBe(204);
		expect((await me("GET", "/settings/templates")).body).toHaveLength(1);
	});

	it("exports transactions as CSV and Excel", async () => {
		await me("POST", "/transactions", {
			type: "expense",
			accountId: bank,
			amount: 12_345,
			occurredAt: new Date().toISOString(),
			note: 'pão; "fresco"',
		});
		const csv = await me("GET", "/settings/export?format=csv");
		expect(csv.status).toBe(200);
		expect(csv.headers["content-disposition"]).toContain(".csv");
		expect(csv.body).toContain("-123.45");
		expect(csv.body).toContain('"pão; ""fresco"""');

		const xlsx = await me("GET", "/settings/export?format=xlsx");
		expect(xlsx.status).toBe(200);
		const files = unzipSync(new Uint8Array(xlsx.raw));
		const sheet = new TextDecoder().decode(files["xl/worksheets/sheet1.xml"]);
		expect(sheet).toContain("<v>-123.45</v>");
	});

	it("updates the profile and deletes the account only with the email", async () => {
		const named = await me("PATCH", "/settings/profile", { name: "Nairo" });
		expect(named.body.name).toBe("Nairo");
		const badImage = await me("PATCH", "/settings/profile", {
			image: "https://example.test/a.png",
		});
		expect(badImage.status).toBe(400);

		const wrong = await me("DELETE", "/settings/profile", {
			email: "outro@example.test",
		});
		expect(wrong.status).toBe(422);
		const ok = await me("DELETE", "/settings/profile", {
			email: `${EMAIL_PREFIX}-main@example.test`,
		});
		expect(ok.status).toBe(204);
		const gone = await db
			.select()
			.from(user)
			.where(eq(user.email, `${EMAIL_PREFIX}-main@example.test`));
		expect(gone).toHaveLength(0);
	});

	it("saves custom shortcuts and refuses clashes", async () => {
		const me = await signUp("shortcuts");
		const saved = await me("PATCH", "/settings/preferences", {
			shortcuts: { palette: "mod+p", assistant: "alt+j" },
		});
		expect(saved.status).toBe(200);
		expect(saved.body.shortcuts).toEqual({
			palette: "mod+p",
			assistant: "alt+j",
		});

		const clash = await me("PATCH", "/settings/preferences", {
			shortcuts: { palette: "mod+p", assistant: "mod+p" },
		});
		expect(clash.status).toBe(400);

		const withDefault = await me("PATCH", "/settings/preferences", {
			shortcuts: { palette: "mod+n" },
		});
		expect(withDefault.status).toBe(400);

		const bare = await me("PATCH", "/settings/preferences", {
			shortcuts: { palette: "p" },
		});
		expect(bare.status).toBe(400);

		const reset = await me("PATCH", "/settings/preferences", { shortcuts: {} });
		expect(reset.body.shortcuts).toEqual({});
	});
});
