import type { SheetPreview } from "@wallet/shared";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useUploadSheet = () =>
	useApiMutation(
		(body: { name: string; contentBase64: string; year: number }) =>
			api<SheetPreview>("/imports/sheet", { method: "POST", body }),
		(qc) => qc.invalidateQueries({ queryKey: ["imports"] }),
	);
