import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { Conversation } from "@wallet/shared";
import { api } from "@/lib/api";

export const useConversations = (q?: string) =>
	useQuery({
		queryKey: ["assistant", "conversations", q ?? ""],
		queryFn: () =>
			api<Conversation[]>("/assistant/conversations", {
				query: { q: q || undefined },
			}),
		placeholderData: keepPreviousData,
	});
