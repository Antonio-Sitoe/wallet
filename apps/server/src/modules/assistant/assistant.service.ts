import type {
	AssistantAnswerData,
	AssistantMessage,
	AssistantStatus,
	Conversation,
	ConversationDetail,
	SendMessageResult,
	UpdateConversationInput,
} from "@wallet/shared";

import { notFound } from "../../shared/errors/app-error";
import type { AssistantProvider } from "./assistant.provider";
import type {
	AssistantRepository,
	ConversationRow,
	MessageRow,
} from "./assistant.repository";

const NEW_TITLE = "Nova conversa";
const TITLE_LENGTH = 60;
const PREVIEW_LENGTH = 90;

const clip = (text: string, max: number) => {
	const flat = text.replace(/\s+/g, " ").trim();
	return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
};

const toConversation = (
	row: ConversationRow,
	preview: string | null,
): Conversation => ({
	id: row.id,
	title: row.title,
	pinned: row.pinned,
	preview: preview ? clip(preview, PREVIEW_LENGTH) : null,
	createdAt: row.createdAt.toISOString(),
	updatedAt: row.updatedAt.toISOString(),
});

const toMessage = (row: MessageRow): AssistantMessage => ({
	id: row.id,
	role: row.role,
	content: row.content,
	data: (row.data as AssistantAnswerData | null) ?? null,
	createdAt: row.createdAt.toISOString(),
});

export class AssistantService {
	constructor(
		private readonly repository: AssistantRepository,
		private readonly provider: AssistantProvider,
	) {}

	status(): AssistantStatus {
		return {
			connected: this.provider.connected,
			provider: this.provider.name,
		};
	}

	async list(userId: string, q?: string): Promise<Conversation[]> {
		const rows = await this.repository.list(userId, q);
		const previews = await this.repository.lastMessages(rows.map((r) => r.id));
		return rows.map((r) => toConversation(r, previews.get(r.id) ?? null));
	}

	private async owned(userId: string, id: string) {
		const row = await this.repository.find(userId, id);
		if (!row) throw notFound("Conversa");
		return row;
	}

	async get(userId: string, id: string): Promise<ConversationDetail> {
		const row = await this.owned(userId, id);
		const messages = (await this.repository.messages(id)).map(toMessage);
		return {
			...toConversation(row, messages.at(-1)?.content ?? null),
			messages,
		};
	}

	async create(userId: string, title?: string): Promise<Conversation> {
		return toConversation(
			await this.repository.create(userId, title ?? NEW_TITLE),
			null,
		);
	}

	async update(userId: string, id: string, input: UpdateConversationInput) {
		await this.owned(userId, id);
		await this.repository.update(userId, id, input);
		return this.get(userId, id);
	}

	async remove(userId: string, id: string) {
		if (!(await this.repository.delete(userId, id))) throw notFound("Conversa");
	}

	async send(
		userId: string,
		id: string,
		content: string,
	): Promise<SendMessageResult> {
		const conversation = await this.owned(userId, id);
		const history = await this.repository.messages(id);
		const asked = new Date();
		const [question] = await this.repository.addMessages([
			{ conversationId: id, role: "user", content, createdAt: asked },
		]);
		const reply = await this.provider.reply({
			userId,
			messages: [
				...history.map((m) => ({ role: m.role, content: m.content })),
				{ role: "user", content },
			],
		});
		const [answer] = await this.repository.addMessages([
			{
				conversationId: id,
				role: "assistant",
				content: reply.content,
				data: reply.data,
				createdAt: new Date(Math.max(Date.now(), asked.getTime() + 1)),
			},
		]);
		if (conversation.title === NEW_TITLE && history.length === 0)
			await this.repository.update(userId, id, {
				title: clip(content, TITLE_LENGTH),
			});
		await this.repository.touch(id);
		const updated = await this.owned(userId, id);
		return {
			conversation: toConversation(updated, reply.content),
			messages: [question!, answer!].map(toMessage),
		};
	}

	async exportMarkdown(userId: string, id: string) {
		const detail = await this.get(userId, id);
		const lines = [`# ${detail.title}`, ""];
		for (const m of detail.messages) {
			lines.push(`**${m.role === "user" ? "Eu" : "Assistente"}**`, "");
			lines.push(m.content, "");
			for (const row of m.data?.rows ?? [])
				lines.push(`- ${row.label}: ${(row.value / 100).toFixed(2)} MZN`);
			if (m.data?.rows?.length) lines.push("");
			if (m.data?.source) lines.push(`_fonte: ${m.data.source}_`, "");
		}
		const slug =
			detail.title
				.normalize("NFD")
				.replace(/\p{Diacritic}/gu, "")
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-|-$/g, "")
				.slice(0, 50) || "conversa";
		return { filename: `${slug}.md`, body: `${lines.join("\n").trimEnd()}\n` };
	}
}
