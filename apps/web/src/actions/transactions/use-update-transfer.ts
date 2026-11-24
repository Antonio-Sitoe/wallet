import type { Transfer, UpdateTransferInput } from "@wallet/shared";
import type { Wire } from "@/@types/wire";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useUpdateTransfer = () =>
	useApiMutation(
		({ id, ...body }: Wire<UpdateTransferInput> & { id: string }) =>
			api<Transfer>(`/transfers/${id}`, { method: "PATCH", body }),
		refreshMoney,
	);
