import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useDeleteImport = () =>
	useApiMutation(
		(id: string) =>
			api<{ removed: { transactions: number; transfers: number } }>(
				`/imports/${id}`,
				{ method: "DELETE" },
			),
		(qc) => {
			refreshMoney(qc);
			qc.invalidateQueries({ queryKey: ["imports"] });
		},
	);
