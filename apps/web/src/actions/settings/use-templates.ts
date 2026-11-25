import { useLiveQuery } from "@tanstack/react-db";
import { useQuery } from "@tanstack/react-query";
import type { TransactionTemplate } from "@wallet/shared";
import { TEMPLATES_KEY } from "@/actions/settings/keys";
import { api } from "@/lib/api";
import { offlineEnabled } from "@/lib/offline/flag";
import { offlineCollections } from "@/lib/offline/registry";

const useTemplatesOnline = () =>
	useQuery({
		queryKey: TEMPLATES_KEY,
		queryFn: () => api<TransactionTemplate[]>("/settings/templates"),
	});

function useTemplatesOffline() {
	const { data, isReady, isLoadingError } = useLiveQuery((q) =>
		q
			.from({ template: offlineCollections().templates })
			.orderBy(({ template }) => template.serverOrder),
	);
	const loaded = isReady || isLoadingError;
	return {
		data: loaded ? (data as TransactionTemplate[]) : undefined,
		isPending: !loaded,
		error: null,
	};
}

export const useTemplates =
	import.meta.env.VITE_DESKTOP === "1" && offlineEnabled
		? useTemplatesOffline
		: useTemplatesOnline;
