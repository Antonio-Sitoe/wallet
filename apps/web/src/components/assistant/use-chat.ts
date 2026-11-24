import { useQueryClient } from "@tanstack/react-query";
import type { ConversationDetail } from "@wallet/shared";
import { useState } from "react";
import { useConversation } from "@/actions/assistant/use-conversation";
import {
	useCreateConversation,
	useSendMessage,
} from "@/actions/assistant/use-conversation-mutations";

export function useChat(
	id: string | undefined,
	onCreated: (id: string) => void,
) {
	const qc = useQueryClient();
	const conversation = useConversation(id);
	const create = useCreateConversation();
	const send = useSendMessage();
	const [pending, setPending] = useState<string | null>(null);

	const ask = async (text: string) => {
		const content = text.trim();
		if (!content || pending) return;
		setPending(content);
		try {
			let target = id;
			if (!target) {
				target = (await create.mutateAsync(undefined)).id;
				onCreated(target);
			}
			const result = await send.mutateAsync({ id: target, content });
			qc.setQueryData<ConversationDetail>(
				["assistant", "conversation", target],
				(old) => {
					const known = new Set(old?.messages.map((m) => m.id));
					return {
						...result.conversation,
						messages: [
							...(old?.messages ?? []),
							...result.messages.filter((m) => !known.has(m.id)),
						],
					};
				},
			);
		} finally {
			setPending(null);
		}
	};

	return {
		conversation: conversation.data,
		messages: id ? (conversation.data?.messages ?? []) : [],
		loading: !!id && conversation.isPending,
		pending,
		ask,
	};
}
