import { useQuery } from "@tanstack/react-query";
import type { Preferences } from "@wallet/shared";
import { PREFERENCES_KEY } from "@/actions/settings/keys";
import { api } from "@/lib/api";

export const usePreferences = () =>
	useQuery({
		queryKey: PREFERENCES_KEY,
		queryFn: () => api<Preferences>("/settings/preferences"),
		staleTime: Number.POSITIVE_INFINITY,
	});
