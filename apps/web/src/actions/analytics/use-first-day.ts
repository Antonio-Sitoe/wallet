import { useQuery } from "@tanstack/react-query";
import type { FirstDay } from "@wallet/shared";
import { api } from "@/lib/api";

export const useFirstDay = (enabled: boolean) =>
	useQuery({
		queryKey: ["analytics", "first-day"],
		queryFn: () => api<FirstDay>("/analytics/first-day"),
		enabled,
	});
