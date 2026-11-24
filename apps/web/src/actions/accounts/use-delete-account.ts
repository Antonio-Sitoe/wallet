import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useDeleteAccount = () =>
	useApiMutation(
		(id: string) => api<void>(`/accounts/${id}`, { method: "DELETE" }),
		refreshMoney,
	);
