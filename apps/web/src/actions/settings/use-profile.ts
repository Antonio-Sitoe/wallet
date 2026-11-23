import { useQuery } from "@tanstack/react-query";
import type { Profile } from "@wallet/shared";
import { PROFILE_KEY } from "@/actions/settings/keys";
import { api } from "@/lib/api";

export const useProfile = () =>
	useQuery({
		queryKey: PROFILE_KEY,
		queryFn: () => api<Profile>("/settings/profile"),
	});
