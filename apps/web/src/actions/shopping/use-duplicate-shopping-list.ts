import type { DuplicateShoppingListInput, ShoppingList } from "@wallet/shared";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { refreshShopping } from "@/actions/shopping/refresh-shopping";
import { api } from "@/lib/api";

export const useDuplicateShoppingList = () =>
	useApiMutation(
		({ id, ...body }: DuplicateShoppingListInput & { id: string }) =>
			api<ShoppingList>(`/shopping-lists/${id}/duplicate`, {
				method: "POST",
				body,
			}),
		refreshShopping,
	);
