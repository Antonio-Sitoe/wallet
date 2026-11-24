import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useResetData = () =>
	useApiMutation(
		(_: void) =>
			api<{ removed: { transactions: number } }>("/accounts/reset", {
				method: "POST",
				body: { confirm: "APAGAR" },
			}),
		refreshMoney,
	);
