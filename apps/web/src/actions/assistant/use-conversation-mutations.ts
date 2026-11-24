import type { QueryClient } from "@tanstack/react-query";
import type {
	Conversation,
	ConversationDetail,
	SendMessageResult,
	UpdateConversationInput,
} from "@wallet/shared";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

const refresh = (qc: QueryClient) =>
	qc.invalidateQueries({ queryKey: ["assistant", "conversations"] });

export const useCreateConversation = () =>
	useApiMutation(
		(title?: string) =>
			api<Conversation>("/assistant/conversations", {
				method: "POST",
				body: title ? { title } : {},
			}),
		refresh,
	);

export const useUpdateConversation = () =>
	useApiMutation(
		({ id, ...body }: UpdateConversationInput & { id: string }) =>
			api<ConversationDetail>(`/assistant/conversations/${id}`, {
				method: "PATCH",
				body,
			}),
		(qc) => {
			refresh(qc);
			qc.invalidateQueries({ queryKey: ["assistant", "conversation"] });
		},
	);

export const useDeleteConversation = () =>
	useApiMutation(
		(id: string) =>
			api<void>(`/assistant/conversations/${id}`, { method: "DELETE" }),
		refresh,
	);

export const useSendMessage = () =>
	useApiMutation(
		({ id, content }: { id: string; content: string }) =>
			api<SendMessageResult>(`/assistant/conversations/${id}/messages`, {
				method: "POST",
				body: { content },
			}),
		(qc) => {
			refresh(qc);
			qc.invalidateQueries({ queryKey: ["assistant", "conversation"] });
		},
	);
