import { session, user } from "@wallet/db/schema/auth";
import { eq, like, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../../app";
import { auth, db } from "../../infrastructure/services";

const app = buildApp({
	db,
	auth,
	corsOrigins: ["http://localhost:3001"],
	logger: false,
});
const EMAIL_PREFIX = `e2e-basic-${Date.now()}`;
const EMAIL = `${EMAIL_PREFIX}@example.test`;
const PASSWORD = "e2e-password-123";

const dbUp = await db
	.execute(sql`select 1`)
	.then(() => true)
	.catch(() => false);

const basic = (email: string, password: string) =>
	`Basic ${Buffer.from(`${email}:${password}`).toString("base64")}`;

const get = (url: string, authorization?: string, ip = "10.0.0.1") =>
	app.inject({
		method: "GET",
		url: `/api${url}`,
		remoteAddress: ip,
		headers: authorization ? { authorization } : {},
	});

describe.runIf(dbUp)("basic auth on the API", () => {
	let userId: string;

	beforeAll(async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/auth/sign-up/email",
			headers: { origin: "http://localhost:3001" },
			payload: { email: EMAIL, password: PASSWORD, name: "E2E basic" },
		});
		expect(res.statusCode).toBe(200);
		const [row] = await db
			.select({ id: user.id })
			.from(user)
			.where(eq(user.email, EMAIL));
		userId = row!.id;
	});

	afterAll(async () => {
		await db.delete(user).where(like(user.email, `${EMAIL_PREFIX}%`));
		await app.close();
	});

	it("accepts the account email and password", async () => {
		const res = await get("/accounts", basic(EMAIL, PASSWORD));
		expect(res.statusCode).toBe(200);
		expect(Array.isArray(JSON.parse(res.body))).toBe(true);
	});

	it("matches the email without caring about case", async () => {
		const res = await get("/accounts", basic(EMAIL.toUpperCase(), PASSWORD));
		expect(res.statusCode).toBe(200);
	});

	it("writes as that user", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/accounts",
			remoteAddress: "10.0.0.1",
			headers: { authorization: basic(EMAIL, PASSWORD) },
			payload: { name: "Basic", type: "cash" },
		});
		expect(res.statusCode).toBe(201);
		const list = JSON.parse(
			(await get("/accounts", basic(EMAIL, PASSWORD))).body,
		);
		expect(list.map((a: { name: string }) => a.name)).toContain("Basic");
	});

	it("does not create a session", async () => {
		const before = await db
			.select({ id: session.id })
			.from(session)
			.where(eq(session.userId, userId));
		await get("/accounts", basic(EMAIL, PASSWORD));
		const after = await db
			.select({ id: session.id })
			.from(session)
			.where(eq(session.userId, userId));
		expect(after.length).toBe(before.length);
	});

	it("rejects an unknown email", async () => {
		expect(
			(
				await get(
					"/accounts",
					basic(`nobody-${EMAIL}`, PASSWORD),
					"10.0.0.3",
				)
			).statusCode,
		).toBe(401);
	});

	it("rejects a wrong password, and blocks after five failures even with the right one", async () => {
		for (let i = 0; i < 5; i++)
			expect(
				(await get("/accounts", basic(EMAIL, "wrong"), "10.0.0.4")).statusCode,
			).toBe(401);
		expect(
			(await get("/accounts", basic(EMAIL, PASSWORD), "10.0.0.4")).statusCode,
		).toBe(429);
	});

	it("still rejects requests without credentials", async () => {
		expect((await get("/accounts", undefined, "10.0.0.5")).statusCode).toBe(
			401,
		);
	});
});
