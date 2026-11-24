import { refreshPlanned } from "@/actions/planned/refresh-planned";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useDeletePlannedPayment = () =>
	useApiMutation(
		(id: string) => api<void>(`/planned-payments/${id}`, { method: "DELETE" }),
		refreshPlanned,
	);
