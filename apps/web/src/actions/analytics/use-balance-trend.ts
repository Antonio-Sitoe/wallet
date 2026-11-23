import { useQuery } from "@tanstack/react-query";
import type { BalancePoint } from "@wallet/shared";
import type { Period } from "@/@types/period";
import { api } from "@/lib/api";

export const useBalanceTrend = (p: Period) =>
	useQuery({
		queryKey: ["analytics", "balance", p],
		queryFn: () => api<BalancePoint[]>("/analytics/balance", { query: p }),
	});
