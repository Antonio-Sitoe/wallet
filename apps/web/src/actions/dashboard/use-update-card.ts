import type { CardSize, DashboardCard } from "@wallet/shared";
import { refreshCards } from "@/actions/dashboard/refresh-cards";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useUpdateCard = () =>
	useApiMutation(
		({
			id,
			...body
		}: {
			id: string;
			size?: CardSize;
			config?: Record<string, unknown>;
		}) =>
			api<DashboardCard>(`/dashboard/cards/${id}`, { method: "PATCH", body }),
		refreshCards,
	);
