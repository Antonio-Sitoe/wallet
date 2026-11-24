import { useQuery } from "@tanstack/react-query";
import type { Category } from "@wallet/shared";
import { api } from "@/lib/api";

export const useCategories = () =>
	useQuery({
		queryKey: ["categories"],
		queryFn: () => api<Category[]>("/categories"),
	});
