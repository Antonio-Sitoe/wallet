import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useDeleteTransfer = () =>
	useApiMutation(
		(id: string) => api<void>(`/transfers/${id}`, { method: "DELETE" }),
		refreshMoney,
	);
