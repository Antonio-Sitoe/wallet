import { useQuery } from "@tanstack/react-query";
import type { ComparisonPoint } from "@wallet/shared";
import type { Period } from "@/@types/period";
import { api } from "@/lib/api";

export const useComparison = (p: Period) =>
	useQuery({
		queryKey: ["analytics", "comparison", p],
		queryFn: () =>
			api<ComparisonPoint[]>("/analytics/comparison", { query: p }),
	});
