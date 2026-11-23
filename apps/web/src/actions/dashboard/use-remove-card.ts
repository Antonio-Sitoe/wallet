import { refreshCards } from "@/actions/dashboard/refresh-cards";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useRemoveCard = () =>
	useApiMutation(
		(id: string) => api<void>(`/dashboard/cards/${id}`, { method: "DELETE" }),
		refreshCards,
	);
