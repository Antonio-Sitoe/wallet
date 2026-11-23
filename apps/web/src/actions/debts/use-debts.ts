import { useQuery } from "@tanstack/react-query";
import type { Debt } from "@wallet/shared";
import { api } from "@/lib/api";

export const useDebts = (includeArchived = false) =>
	useQuery({
		queryKey: ["debts", { includeArchived }],
		queryFn: () => api<Debt[]>("/debts", { query: { includeArchived } }),
	});
