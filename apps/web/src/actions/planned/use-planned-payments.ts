import { useQuery } from "@tanstack/react-query";
import type { PlannedPayment } from "@wallet/shared";
import { api } from "@/lib/api";

export const usePlannedPayments = (includeArchived = false) =>
	useQuery({
		queryKey: ["planned", "payments", { includeArchived }],
		queryFn: () =>
			api<PlannedPayment[]>("/planned-payments", {
				query: { includeArchived },
			}),
	});
