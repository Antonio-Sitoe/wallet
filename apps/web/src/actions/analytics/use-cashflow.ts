import { useQuery } from "@tanstack/react-query";
import type { Bucket, CashflowTrend } from "@wallet/shared";
import type { Period } from "@/@types/period";
import { api } from "@/lib/api";

export const useCashflow = (p: Period, bucket?: Bucket) =>
	useQuery({
		queryKey: ["analytics", "cashflow", p, bucket],
		queryFn: () =>
			api<CashflowTrend>("/analytics/cashflow", { query: { ...p, bucket } }),
	});
