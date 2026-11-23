import type { Account } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useZeroBalances = () =>
	useApiMutation(
		(body: { at?: string }) =>
			api<Account[]>("/accounts/zero-balances", { method: "POST", body }),
		refreshMoney,
	);
