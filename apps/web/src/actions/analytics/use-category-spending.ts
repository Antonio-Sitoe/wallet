import { useQuery } from "@tanstack/react-query";
import type { CategoryBreakdown } from "@wallet/shared";
import type { Period } from "@/@types/period";
import { api } from "@/lib/api";

export const useCategorySpending = (p: Period, limit = 6) =>
	useQuery({
		queryKey: ["analytics", "categories", p, limit],
		queryFn: () =>
			api<CategoryBreakdown>("/analytics/categories", {
				query: { ...p, limit },
			}),
	});
