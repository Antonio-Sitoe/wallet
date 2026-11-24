import type { PlannedPayment, UpdatePlannedPaymentInput } from "@wallet/shared";
import { refreshPlanned } from "@/actions/planned/refresh-planned";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useUpdatePlannedPayment = () =>
	useApiMutation(
		({ id, ...body }: UpdatePlannedPaymentInput & { id: string }) =>
			api<PlannedPayment>(`/planned-payments/${id}`, { method: "PATCH", body }),
		refreshPlanned,
	);
