import { useQuery } from "@tanstack/react-query";
import type { TransactionTemplate } from "@wallet/shared";
import { TEMPLATES_KEY } from "@/actions/settings/keys";
import { api } from "@/lib/api";

export const useTemplates = () =>
	useQuery({
		queryKey: TEMPLATES_KEY,
		queryFn: () => api<TransactionTemplate[]>("/settings/templates"),
	});
