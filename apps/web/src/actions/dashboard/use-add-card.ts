import type {
	CardSize,
	DashboardCard,
	DashboardCardType,
} from "@wallet/shared";
import { refreshCards } from "@/actions/dashboard/refresh-cards";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useAddCard = () =>
	useApiMutation(
		(body: {
			type: DashboardCardType;
			size?: CardSize;
			config?: Record<string, unknown>;
		}) => api<DashboardCard>("/dashboard/cards", { method: "POST", body }),
		refreshCards,
	);
