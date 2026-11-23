import type { ImportPreview } from "@wallet/shared";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useUploadWallet = () =>
	useApiMutation(
		(files: { name: string; content: string }[]) =>
			api<ImportPreview>("/imports/wallet", {
				method: "POST",
				body: { files },
			}),
		(qc) => qc.invalidateQueries({ queryKey: ["imports"] }),
	);
