import type { Account, UpdateAccountInput } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useUpdateAccount = () =>
	useApiMutation(
		({ id, ...body }: UpdateAccountInput & { id: string }) =>
			api<Account>(`/accounts/${id}`, { method: "PATCH", body }),
		refreshMoney,
	);
