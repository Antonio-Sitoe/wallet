import type { Account, CreateAccountInput } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useCreateAccount = () =>
	useApiMutation(
		(
			body: Partial<CreateAccountInput> &
				Pick<CreateAccountInput, "name" | "type">,
		) => api<Account>("/accounts", { method: "POST", body }),
		refreshMoney,
	);
