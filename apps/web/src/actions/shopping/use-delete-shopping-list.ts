import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { refreshShopping } from "@/actions/shopping/refresh-shopping";
import { api } from "@/lib/api";

export const useDeleteShoppingList = () =>
	useApiMutation(
		(id: string) => api<void>(`/shopping-lists/${id}`, { method: "DELETE" }),
		refreshShopping,
	);
