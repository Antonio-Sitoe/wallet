import type { AddShoppingItemInput, ShoppingList } from "@wallet/shared";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { refreshShopping } from "@/actions/shopping/refresh-shopping";
import { api } from "@/lib/api";

export const useAddShoppingItem = () =>
	useApiMutation(
		({ listId, ...body }: AddShoppingItemInput & { listId: string }) =>
			api<ShoppingList>(`/shopping-lists/${listId}/items`, {
				method: "POST",
				body,
			}),
		refreshShopping,
	);
