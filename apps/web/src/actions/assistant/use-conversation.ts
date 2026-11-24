import { useQuery } from "@tanstack/react-query";
import type { ConversationDetail } from "@wallet/shared";
import { api } from "@/lib/api";

export const useConversation = (id: string | undefined) =>
	useQuery({
		queryKey: ["assistant", "conversation", id],
		queryFn: () => api<ConversationDetail>(`/assistant/conversations/${id}`),
		enabled: !!id,
	});
