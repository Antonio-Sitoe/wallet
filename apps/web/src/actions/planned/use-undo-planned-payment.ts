import type { PlannedOccurrence } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useUndoPlannedPayment = () =>
	useApiMutation(
		({ id, dueDate }: { id: string; dueDate: string }) =>
			api<PlannedOccurrence>(`/planned-payments/${id}/occurrences/${dueDate}`, {
				method: "DELETE",
			}),
		refreshMoney,
	);
