import type { ShoppingList } from "@wallet/shared";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { refreshShopping } from "@/actions/shopping/refresh-shopping";
import { api } from "@/lib/api";

export const useRemoveShoppingItem = () =>
	useApiMutation(
		({ listId, itemId }: { listId: string; itemId: string }) =>
			api<ShoppingList>(`/shopping-lists/${listId}/items/${itemId}`, {
				method: "DELETE",
			}),
		refreshShopping,
	);
