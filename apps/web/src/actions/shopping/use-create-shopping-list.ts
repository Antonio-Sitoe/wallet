import type { CreateShoppingListInput, ShoppingList } from "@wallet/shared";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { refreshShopping } from "@/actions/shopping/refresh-shopping";
import { api } from "@/lib/api";

export const useCreateShoppingList = () =>
	useApiMutation(
		(body: CreateShoppingListInput) =>
			api<ShoppingList>("/shopping-lists", { method: "POST", body }),
		refreshShopping,
	);
