import { useQuery } from "@tanstack/react-query";
import type { LabelUsage } from "@wallet/shared";
import { api } from "@/lib/api";

export const useLabels = () =>
	useQuery({
		queryKey: ["transactions", "labels"],
		queryFn: () => api<LabelUsage[]>("/transactions/labels"),
		staleTime: 60_000,
	});
