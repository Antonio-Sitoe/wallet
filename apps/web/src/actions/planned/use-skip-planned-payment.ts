import type { PlannedOccurrence } from "@wallet/shared";
import { refreshPlanned } from "@/actions/planned/refresh-planned";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useSkipPlannedPayment = () =>
	useApiMutation(
		({ id, dueDate }: { id: string; dueDate: string }) =>
			api<PlannedOccurrence>(`/planned-payments/${id}/skip`, {
				method: "POST",
				body: { dueDate },
			}),
		refreshPlanned,
	);
