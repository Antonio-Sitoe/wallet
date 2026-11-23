import { useQuery } from "@tanstack/react-query";
import type { Overview } from "@wallet/shared";
import type { Period } from "@/@types/period";
import { api } from "@/lib/api";

export const useOverview = (p: Period) =>
	useQuery({
		queryKey: ["analytics", "overview", p],
		queryFn: () => api<Overview>("/analytics/overview", { query: p }),
	});
