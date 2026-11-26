import { createHash } from "node:crypto";

export type IncomingMessage = {
	messageId: string;
	phone: string;
	text: string;
};

type Payload = {
	event?: unknown;
	data?: {
		key?: {
			id?: unknown;
			remoteJid?: unknown;
			remoteJidAlt?: unknown;
			senderPn?: unknown;
			fromMe?: unknown;
		};
		message?: {
			conversation?: unknown;
			extendedTextMessage?: { text?: unknown };
		};
	};
};

const PHONE_JID = /^(\d{8,15})@s\.whatsapp\.net$/;

function phoneOf(jid: unknown) {
	if (typeof jid !== "string") return null;
	return jid.match(PHONE_JID)?.[1] ?? null;
}

export function readIncoming(body: unknown): IncomingMessage | null {
	const payload = (body ?? {}) as Payload;
	if (
		typeof payload.event === "string" &&
		!/^messages[._-]?upsert$/i.test(payload.event)
	)
		return null;
	const key = payload.data?.key;
	if (!key || key.fromMe === true || typeof key.id !== "string") return null;
	const remote = typeof key.remoteJid === "string" ? key.remoteJid : "";
	if (remote.endsWith("@g.us") || remote === "status@broadcast") return null;
	const phone =
		phoneOf(key.remoteJid) ?? phoneOf(key.remoteJidAlt) ?? phoneOf(key.senderPn);
	if (!phone) return null;
	const message = payload.data?.message;
	const text =
		typeof message?.conversation === "string"
			? message.conversation
			: typeof message?.extendedTextMessage?.text === "string"
				? message.extendedTextMessage.text
				: "";
	if (!text.trim()) return null;
	return { messageId: key.id, phone, text };
}

const NAMESPACE = "6f1e3f6a-2b7c-4c1d-9a55-8d0e5c1b7a42";

export function uuidFromMessage(messageId: string) {
	const namespace = Buffer.from(NAMESPACE.replace(/-/g, ""), "hex");
	const hash = createHash("sha1")
		.update(namespace)
		.update(`whatsapp:${messageId}`)
		.digest();
	hash[6] = ((hash[6] ?? 0) & 0x0f) | 0x50;
	hash[8] = ((hash[8] ?? 0) & 0x3f) | 0x80;
	const hex = hash.subarray(0, 16).toString("hex");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
