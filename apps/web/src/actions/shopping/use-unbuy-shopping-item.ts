import type { ShoppingList } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useUnbuyShoppingItem = () =>
	useApiMutation(
		({ listId, itemId }: { listId: string; itemId: string }) =>
			api<ShoppingList>(`/shopping-lists/${listId}/items/${itemId}/buy`, {
				method: "DELETE",
			}),
		refreshMoney,
	);
