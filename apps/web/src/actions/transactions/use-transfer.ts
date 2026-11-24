import { useQuery } from "@tanstack/react-query";
import type { Transfer } from "@wallet/shared";
import { api } from "@/lib/api";

export const useTransfer = (id: string | null) =>
	useQuery({
		queryKey: ["transfer", id],
		queryFn: () => api<Transfer>(`/transfers/${id}`),
		enabled: !!id,
	});
