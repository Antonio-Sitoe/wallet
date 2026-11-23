import type { DashboardCard } from "@wallet/shared";
import { refreshCards } from "@/actions/dashboard/refresh-cards";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useResetCards = () =>
	useApiMutation(
		() => api<DashboardCard[]>("/dashboard/cards/reset", { method: "POST" }),
		refreshCards,
	);
