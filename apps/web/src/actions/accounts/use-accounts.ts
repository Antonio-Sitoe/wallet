import { useQuery } from "@tanstack/react-query";
import type { Account } from "@wallet/shared";
import { api } from "@/lib/api";

export const useAccounts = (includeArchived = false) =>
	useQuery({
		queryKey: ["accounts", { includeArchived }],
		queryFn: () => api<Account[]>("/accounts", { query: { includeArchived } }),
	});
