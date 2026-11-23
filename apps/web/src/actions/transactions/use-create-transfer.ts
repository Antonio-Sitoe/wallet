import type { CreateTransferInput, Transfer } from "@wallet/shared";
import type { Wire } from "@/@types/wire";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useCreateTransfer = () =>
	useApiMutation(
		(
			body: Wire<Omit<CreateTransferInput, "referenceMonth">> & {
				referenceMonth?: string;
			},
		) => api<Transfer>("/transfers", { method: "POST", body }),
		refreshMoney,
	);
