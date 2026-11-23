import { useQuery } from "@tanstack/react-query";
import type { ShoppingPrice } from "@wallet/shared";
import { api } from "@/lib/api";

export const useShoppingPrices = () =>
	useQuery({
		queryKey: ["shopping", "prices"],
		queryFn: () => api<ShoppingPrice[]>("/shopping-lists/prices"),
	});
