import { useQuery } from "@tanstack/react-query";
import type { ShoppingList } from "@wallet/shared";
import { api } from "@/lib/api";

export const useShoppingList = (id: string | undefined) =>
	useQuery({
		queryKey: ["shopping", "list", id],
		queryFn: () => api<ShoppingList>(`/shopping-lists/${id}`),
		enabled: !!id,
	});
