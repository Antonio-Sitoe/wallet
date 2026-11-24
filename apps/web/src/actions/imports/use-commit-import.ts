import type { CommitImportInput, ImportPreview } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useCommitImport = () =>
	useApiMutation(
		({ id, ...body }: Partial<CommitImportInput> & { id: string }) =>
			api<
				ImportPreview & {
					result: {
						transactions: number;
						transfers: number;
						skippedDuplicates: number;
						ignored: number;
					};
				}
			>(`/imports/${id}/commit`, { method: "POST", body }),
		(qc) => {
			refreshMoney(qc);
			qc.invalidateQueries({ queryKey: ["imports"] });
			qc.invalidateQueries({ queryKey: ["import"] });
			qc.invalidateQueries({ queryKey: ["wallet-map"] });
		},
	);
