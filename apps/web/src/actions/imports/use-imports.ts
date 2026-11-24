import { useQuery } from "@tanstack/react-query";
import type { ImportBatchSummary } from "@wallet/shared";
import { api } from "@/lib/api";

export const useImports = () =>
	useQuery({
		queryKey: ["imports"],
		queryFn: () => api<ImportBatchSummary[]>("/imports"),
	});
