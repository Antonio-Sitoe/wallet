import type { ShoppingList, UpdateShoppingListInput } from "@wallet/shared";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { refreshShopping } from "@/actions/shopping/refresh-shopping";
import { api } from "@/lib/api";

export const useUpdateShoppingList = () =>
	useApiMutation(
		({ id, ...body }: UpdateShoppingListInput & { id: string }) =>
			api<ShoppingList>(`/shopping-lists/${id}`, { method: "PATCH", body }),
		refreshShopping,
	);
