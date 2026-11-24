import { useQuery } from "@tanstack/react-query";
import type { BalancePoint } from "@wallet/shared";
import type { Period } from "@/@types/period";
import { api } from "@/lib/api";

export const useBalanceTrend = (p: Period, accountId?: string) =>
	useQuery({
		queryKey: ["analytics", "balance", p, accountId ?? "all"],
		queryFn: () =>
			api<BalancePoint[]>("/analytics/balance", {
				query: accountId ? { ...p, accountId } : p,
			}),
	});
