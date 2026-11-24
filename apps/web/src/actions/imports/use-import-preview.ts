import { useQuery } from "@tanstack/react-query";
import type { ImportPreview } from "@wallet/shared";
import { api } from "@/lib/api";

export const useImportPreview = (id: string | null) =>
	useQuery({
		queryKey: ["import", id],
		queryFn: () => api<ImportPreview>(`/imports/${id}`),
		enabled: !!id,
	});
