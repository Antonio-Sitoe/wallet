import { useQuery } from "@tanstack/react-query";
import type { SheetPreview } from "@wallet/shared";
import { api } from "@/lib/api";

export const useSheetPreview = (id: string | null) =>
	useQuery({
		queryKey: ["sheet", id],
		queryFn: () => api<SheetPreview>(`/imports/sheet/${id}`),
		enabled: !!id,
	});
