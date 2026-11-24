import type { WalletMapping } from "@wallet/shared";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useSetWalletMapping = () =>
	useApiMutation(
		(body: WalletMapping) =>
			api<WalletMapping[]>("/categories/wallet-map", { method: "PUT", body }),
		(qc) => {
			qc.invalidateQueries({ queryKey: ["wallet-map"] });
			qc.invalidateQueries({ queryKey: ["categories"] });
			qc.invalidateQueries({ queryKey: ["import"] });
		},
	);
