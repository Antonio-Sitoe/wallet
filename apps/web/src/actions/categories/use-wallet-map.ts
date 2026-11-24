import { useQuery } from "@tanstack/react-query";
import type { WalletMapping } from "@wallet/shared";
import { api } from "@/lib/api";

export const useWalletMap = () =>
	useQuery({
		queryKey: ["wallet-map"],
		queryFn: () => api<WalletMapping[]>("/categories/wallet-map"),
	});
