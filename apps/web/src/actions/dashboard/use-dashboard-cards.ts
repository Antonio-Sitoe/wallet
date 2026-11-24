import { useQuery } from "@tanstack/react-query";
import type { DashboardCard } from "@wallet/shared";
import { api } from "@/lib/api";

export const useDashboardCards = () =>
	useQuery({
		queryKey: ["dashboard-cards"],
		queryFn: () => api<DashboardCard[]>("/dashboard/cards"),
	});
