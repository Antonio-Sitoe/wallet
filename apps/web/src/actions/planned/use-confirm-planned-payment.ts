import type {
	ConfirmPlannedPaymentInput,
	PlannedOccurrence,
} from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useConfirmPlannedPayment = () =>
	useApiMutation(
		({ id, ...body }: ConfirmPlannedPaymentInput & { id: string }) =>
			api<PlannedOccurrence>(`/planned-payments/${id}/confirm`, {
				method: "POST",
				body,
			}),
		refreshMoney,
	);
