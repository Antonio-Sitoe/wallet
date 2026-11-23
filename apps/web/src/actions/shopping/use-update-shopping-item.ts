import type { ShoppingList, UpdateShoppingItemInput } from "@wallet/shared";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { refreshShopping } from "@/actions/shopping/refresh-shopping";
import { api } from "@/lib/api";

export const useUpdateShoppingItem = () =>
	useApiMutation(
		({
			listId,
			itemId,
			...body
		}: UpdateShoppingItemInput & { listId: string; itemId: string }) =>
			api<ShoppingList>(`/shopping-lists/${listId}/items/${itemId}`, {
				method: "PATCH",
				body,
			}),
		refreshShopping,
	);
