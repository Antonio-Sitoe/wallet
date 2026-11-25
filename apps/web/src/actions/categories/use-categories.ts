import { useLiveQuery } from "@tanstack/react-db";
import { useQuery } from "@tanstack/react-query";
import type { Category } from "@wallet/shared";
import { api } from "@/lib/api";
import { offlineEnabled } from "@/lib/offline/flag";
import { offlineCollections } from "@/lib/offline/registry";

const useCategoriesOnline = () =>
	useQuery({
		queryKey: ["categories"],
		queryFn: () => api<Category[]>("/categories"),
	});

function useCategoriesOffline() {
	const { data, isReady, isLoadingError } = useLiveQuery((q) =>
		q
			.from({ category: offlineCollections().categories })
			.orderBy(({ category }) => category.serverOrder),
	);
	const loaded = isReady || isLoadingError;
	return {
		data: loaded ? (data as Category[]) : undefined,
		isPending: !loaded,
		error: null,
	};
}

export const useCategories =
	import.meta.env.VITE_DESKTOP === "1" && offlineEnabled
		? useCategoriesOffline
		: useCategoriesOnline;
