import { describe, expect, it } from "vitest";

import { afterWriteReply, interpret, toCents } from "./whatsapp.interpreter";
import { readIncoming, uuidFromMessage } from "./whatsapp.message";

const accounts = [
	{ id: "a1", name: "BIM", balance: 0 },
	{ id: "a2", name: "BIM (Poupança)", balance: 2522600 },
	{ id: "a3", name: "M-Pesa", balance: 110000 },
	{ id: "a4", name: "BCI", balance: -5653900 },
	{ id: "a5", name: "Xitique (Poupança)", balance: 27555300 },
	{ id: "a6", name: "Xitique", balance: 7200000 },
];
const categories = [
	{ id: "c1", name: "Alimentação", kind: "expense", archived: false },
	{ id: "c2", name: "Salário", kind: "income", archived: false },
	{ id: "c3", name: "Antiga", kind: "expense", archived: true },
];
const run = (text: string) => interpret(text, accounts, categories);

describe("interpret", () => {
	it("lists balances", () => {
		const plan = run("Saldo");
		expect(plan.kind).toBe("reply");
		expect(plan.kind === "reply" && plan.text).toContain("M-Pesa: 1 100,00");
		expect(plan.kind === "reply" && plan.text).toContain("Total: ");
	});

	it("reads an expense with a category", () => {
		expect(run("- 250 mpesa pão #alimentação")).toMatchObject({
			kind: "transaction",
			type: "expense",
			accountId: "a3",
			categoryId: "c1",
			amount: 25000,
			note: "pão",
		});
	});

	it("reads income and transfers", () => {
		expect(run("+ 5000 bci salário #salario")).toMatchObject({
			type: "income",
			categoryId: "c2",
		});
		expect(run("t 1000 bci mpesa renda")).toMatchObject({
			kind: "transfer",
			fromAccountId: "a4",
			toAccountId: "a3",
			amount: 100000,
			note: "renda",
		});
		expect(run("t 1000 bci bci")).toMatchObject({ kind: "reply" });
	});

	it("parses amounts with thousands separators", () => {
		expect(toCents("1.500")).toBe(150000);
		expect(toCents("1.500,50")).toBe(150050);
		expect(toCents("12.5")).toBe(1250);
		expect(toCents("12,5")).toBe(1250);
		expect(toCents("0")).toBeNull();
		expect(toCents("abc")).toBeNull();
	});

	it("prefers the exact account name and asks when unsure", () => {
		expect(run("- 1 bim x")).toMatchObject({ accountId: "a1" });
		const unsure = run("- 1 xit x");
		expect(unsure.kind === "reply" && unsure.text).toContain(
			"Qual conta? Xitique (Poupança) / Xitique",
		);
		const missing = run("- 1 nada x");
		expect(missing.kind === "reply" && missing.text).toContain(
			'Não encontrei a conta "nada"',
		);
	});

	it("only matches active categories of the right kind", () => {
		expect(run("+ 1 mpesa x #alimentacao").kind).toBe("reply");
		expect(run("- 1 mpesa x #antiga").kind).toBe("reply");
	});

	it("stays quiet on plain text and helps on request", () => {
		expect(run("olá, lembrar da renda")).toEqual({ kind: "silent" });
		expect(run("ajuda")).toMatchObject({ kind: "reply" });
		expect(run("?")).toMatchObject({ kind: "reply" });
	});

	it("formats the reply after a write", () => {
		expect(afterWriteReply("Saída 1,00 MZN · M-Pesa", ["a3"], accounts)).toBe(
			"✅ Saída 1,00 MZN · M-Pesa\nSaldo agora:\nM-Pesa: 1 100,00",
		);
	});
});

const payload = (key: object, text = "saldo") => ({
	event: "messages.upsert",
	data: { key: { id: "MSG1", ...key }, message: { conversation: text } },
});

describe("readIncoming", () => {
	it("reads the sender phone and text", () => {
		expect(
			readIncoming(payload({ remoteJid: "258878984953@s.whatsapp.net" })),
		).toEqual({ messageId: "MSG1", phone: "258878984953", text: "saldo" });
	});

	it("falls back to the phone fields when the chat uses a lid", () => {
		expect(
			readIncoming(
				payload({
					remoteJid: "123456789@lid",
					remoteJidAlt: "258878984953@s.whatsapp.net",
				}),
			)?.phone,
		).toBe("258878984953");
		expect(
			readIncoming(
				payload({
					remoteJid: "123456789@lid",
					senderPn: "258878984953@s.whatsapp.net",
				}),
			)?.phone,
		).toBe("258878984953");
	});

	it("reads extended text messages", () => {
		const body = {
			event: "messages.upsert",
			data: {
				key: { id: "M", remoteJid: "258878984953@s.whatsapp.net" },
				message: { extendedTextMessage: { text: "saldo" } },
			},
		};
		expect(readIncoming(body)?.text).toBe("saldo");
	});

	it("ignores own messages, groups, status, other events and empty text", () => {
		expect(
			readIncoming(
				payload({ remoteJid: "258878984953@s.whatsapp.net", fromMe: true }),
			),
		).toBeNull();
		expect(readIncoming(payload({ remoteJid: "1203@g.us" }))).toBeNull();
		expect(readIncoming(payload({ remoteJid: "status@broadcast" }))).toBeNull();
		expect(
			readIncoming({
				...payload({ remoteJid: "258878984953@s.whatsapp.net" }),
				event: "messages.update",
			}),
		).toBeNull();
		expect(
			readIncoming(payload({ remoteJid: "258878984953@s.whatsapp.net" }, "  ")),
		).toBeNull();
		expect(readIncoming(null)).toBeNull();
	});
});

describe("uuidFromMessage", () => {
	it("is a stable version 5 uuid per message", () => {
		const id = uuidFromMessage("3EB0ABC");
		expect(id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		);
		expect(uuidFromMessage("3EB0ABC")).toBe(id);
		expect(uuidFromMessage("3EB0ABD")).not.toBe(id);
	});
});
