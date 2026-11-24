import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DashboardCard } from "@wallet/shared";
import { toast } from "sonner";
import { refreshCards } from "@/actions/dashboard/refresh-cards";
import { api, errorMessage } from "@/lib/api";

export const useReorderCards = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (ids: string[]) =>
			api<DashboardCard[]>("/dashboard/cards/order", {
				method: "PUT",
				body: { ids },
			}),
		onMutate: (ids) => {
			const current = qc.getQueryData<DashboardCard[]>(["dashboard-cards"]);
			if (current)
				qc.setQueryData(
					["dashboard-cards"],
					ids.map((id) => current.find((c) => c.id === id)).filter(Boolean),
				);
		},
		onError: (error) => {
			toast.error(errorMessage(error));
			refreshCards(qc);
		},
		onSettled: () => refreshCards(qc),
	});
};
