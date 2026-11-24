import type { CreatePlannedPaymentInput, PlannedPayment } from "@wallet/shared";
import { refreshPlanned } from "@/actions/planned/refresh-planned";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useCreatePlannedPayment = () =>
	useApiMutation(
		(body: CreatePlannedPaymentInput) =>
			api<PlannedPayment>("/planned-payments", { method: "POST", body }),
		refreshPlanned,
	);
