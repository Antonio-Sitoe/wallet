import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useDeleteCategory = () =>
	useApiMutation(
		(id: string) => api<void>(`/categories/${id}`, { method: "DELETE" }),
		refreshMoney,
	);
