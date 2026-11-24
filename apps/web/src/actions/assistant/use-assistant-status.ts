import { useQuery } from "@tanstack/react-query";
import type { AssistantStatus } from "@wallet/shared";
import { api } from "@/lib/api";

export const useAssistantStatus = () =>
	useQuery({
		queryKey: ["assistant", "status"],
		queryFn: () => api<AssistantStatus>("/assistant/status"),
		staleTime: 5 * 60_000,
	});
