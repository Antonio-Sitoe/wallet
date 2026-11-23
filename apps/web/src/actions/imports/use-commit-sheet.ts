import type { CommitSheetInput, SheetPreview } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useCommitSheet = () =>
	useApiMutation(
		({ id, ...body }: Partial<CommitSheetInput> & { id: string }) =>
			api<SheetPreview>(`/imports/sheet/${id}/commit`, {
				method: "POST",
				body,
			}),
		(qc) => {
			refreshMoney(qc);
			qc.invalidateQueries({ queryKey: ["imports"] });
			qc.invalidateQueries({ queryKey: ["sheet"] });
		},
	);
