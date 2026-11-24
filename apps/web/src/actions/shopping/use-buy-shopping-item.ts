import type { BuyShoppingItemInput, ShoppingList } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useBuyShoppingItem = () =>
	useApiMutation(
		({
			listId,
			itemId,
			...body
		}: BuyShoppingItemInput & { listId: string; itemId: string }) =>
			api<ShoppingList>(`/shopping-lists/${listId}/items/${itemId}/buy`, {
				method: "POST",
				body,
			}),
		refreshMoney,
	);
