import { z } from "zod";

export const ASSISTANT_ROLES = ["user", "assistant"] as const;
export type AssistantRole = (typeof ASSISTANT_ROLES)[number];

export type AssistantRow = {
	label: string;
	value: number;
	color?: string | null;
};

export type AssistantAction = { label: string; href: string };

export type AssistantAnswerData = {
	rows?: AssistantRow[];
	source?: string;
	actions?: AssistantAction[];
};

export type AssistantMessage = {
	id: string;
	role: AssistantRole;
	content: string;
	data: AssistantAnswerData | null;
	createdAt: string;
};

export type Conversation = {
	id: string;
	title: string;
	pinned: boolean;
	preview: string | null;
	createdAt: string;
	updatedAt: string;
};

export type ConversationDetail = Conversation & {
	messages: AssistantMessage[];
};

export type AssistantStatus = {
	connected: boolean;
	provider: string | null;
};

export const listConversationsQuery = z.object({
	q: z.string().trim().min(1).max(120).optional(),
});

export const createConversationInput = z.object({
	title: z.string().trim().min(1).max(120).optional(),
});
export type CreateConversationInput = z.infer<typeof createConversationInput>;

export const updateConversationInput = z
	.object({
		title: z.string().trim().min(1).max(120),
		pinned: z.boolean(),
	})
	.partial();
export type UpdateConversationInput = z.infer<typeof updateConversationInput>;

export const sendMessageInput = z.object({
	content: z.string().trim().min(1).max(4000),
});
export type SendMessageInput = z.infer<typeof sendMessageInput>;

export type SendMessageResult = {
	conversation: Conversation;
	messages: AssistantMessage[];
};
