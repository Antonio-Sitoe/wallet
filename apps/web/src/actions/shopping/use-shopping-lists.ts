import { useQuery } from "@tanstack/react-query";
import type { ShoppingListSummary } from "@wallet/shared";
import { api } from "@/lib/api";

export const useShoppingLists = (includeArchived = false) =>
	useQuery({
		queryKey: ["shopping", "lists", { includeArchived }],
		queryFn: () =>
			api<ShoppingListSummary[]>("/shopping-lists", {
				query: { includeArchived },
			}),
	});
