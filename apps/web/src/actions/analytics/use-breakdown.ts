import { useQuery } from "@tanstack/react-query";
import type { Breakdown, BreakdownDimension, MoneyFlow } from "@wallet/shared";
import type { Period } from "@/@types/period";
import { api } from "@/lib/api";

export const useBreakdown = (
	p: Period,
	by: BreakdownDimension,
	flow: MoneyFlow,
	limit = 7,
) =>
	useQuery({
		queryKey: ["analytics", "breakdown", p, by, flow, limit],
		queryFn: () =>
			api<Breakdown>("/analytics/breakdown", {
				query: { ...p, by, flow, limit },
			}),
	});
