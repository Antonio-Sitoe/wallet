import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { user } from "@wallet/db/schema/auth";
import { like, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../../app";
import { auth, db } from "../../infrastructure/services";

const SHEET = resolve(
	import.meta.dirname,
	"../../../../../docs/assets/Calculo Financeiro - 2026.xlsx",
);

const app = buildApp({
	db,
	auth,
	corsOrigins: ["http://localhost:3001"],
	logger: false,
});
const EMAIL_PREFIX = `e2e-folha-metas-${Date.now()}`;

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
			name: "E2E folha metas",
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

describe.runIf(dbUp)("sheet import: goals and debts", () => {
	let me: Client;
	let savings: string;
	let preview: any;

	beforeAll(async () => {
		me = await signUp();
		savings = (await me("POST", "/accounts", { name: "BIM", type: "savings" }))
			.body.id;
		preview = (
			await me("POST", "/imports/sheet", {
				name: "Calculo Financeiro - 2026.xlsx",
				contentBase64: readFileSync(SHEET).toString("base64"),
				year: 2026,
			})
		).body;
	});

	afterAll(async () => {
		await db.delete(user).where(like(user.email, `${EMAIL_PREFIX}%`));
	});

	it("previews the emergency fund, Obra and the parts", () => {
		expect(preview.goals.map((g: { key: string }) => g.key)).toEqual([
			"emergencia",
			"obra",
		]);
		const [emergency, obra] = preview.goals;
		expect(emergency.saved).toBe(1_625_000);
		expect(emergency.suggestedTarget).toBe(true);
		expect(obra).toMatchObject({ saved: 2_700_000, target: 5_000_000 });
		expect(preview.goalParts).toHaveLength(4);
		expect(preview.goalAccountId).toBe(savings);
		expect(preview.otherSheets).not.toContain("Emergencia");
		expect(preview.otherSheets).not.toContain("Dividas");
	});

	it("previews the debts tab: six people owe me, I owe Edi", () => {
		expect(preview.debts).toHaveLength(7);
		expect(
			preview.debts.filter(
				(d: { direction: string }) => d.direction === "i_owe",
			),
		).toEqual([expect.objectContaining({ person: "Edi", amount: 200_000 })]);
	});

	it("imports only the goals, with the parts the user kept", async () => {
		const moto = preview.goalParts.find((p: { name: string }) =>
			p.name.startsWith("Investimento"),
		).key;
		const casamento = preview.goalParts.find((p: { name: string }) =>
			p.name.startsWith("Casamento"),
		).key;
		const r = await me("POST", `/imports/sheet/${preview.id}/commit`, {
			months: preview.months.map((m: { month: string }) => ({
				month: m.month,
				include: false,
				createPayments: false,
			})),
			goals: [{ key: "emergencia", include: true, target: 26_850_000 }],
			partGoals: { [moto]: null, [casamento]: null },
			debts: preview.debts.map((d: { key: string; person: string }) => ({
				key: d.key,
				include: d.person !== "Roberto",
			})),
		});
		expect(r.status).toBe(200);
		expect(r.body.result.goals).toBe(2);
		expect(r.body.result.debts).toBe(6);
		const debts = (await me("GET", "/debts")).body as { imported: boolean }[];
		expect(debts).toHaveLength(6);
		expect(debts.every((d) => d.imported)).toBe(true);
		expect(r.body.result.monthItems).toBe(0);

		const goals = (await me("GET", "/goals")).body as {
			name: string;
			saved: number;
			target: number;
			parts: { name: string; paid: boolean; amount: number }[];
		}[];
		const emergency = goals.find((g) => g.name === "Fundo de emergência")!;
		expect(emergency).toMatchObject({ saved: 1_625_000, target: 26_850_000 });
		const obra = goals.find((g) => g.name === "Obra")!;
		expect(obra.parts).toEqual([
			expect.objectContaining({
				name: "Pedreiro",
				amount: 1_500_000,
				paid: false,
			}),
			expect.objectContaining({ name: "Fossa", amount: 1_550_000, paid: true }),
		]);
	});

	it("undoing the import removes the goals and the debts", async () => {
		const r = await me("DELETE", `/imports/${preview.id}`);
		expect(r.status).toBe(200);
		expect((await me("GET", "/goals")).body).toHaveLength(0);
		expect((await me("GET", "/debts")).body).toHaveLength(0);
	});
});
