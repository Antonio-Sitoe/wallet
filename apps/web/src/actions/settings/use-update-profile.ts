import type { Profile, UpdateProfileInput } from "@wallet/shared";
import { PROFILE_KEY } from "@/actions/settings/keys";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

export const useUpdateProfile = () =>
	useApiMutation(
		(body: UpdateProfileInput) =>
			api<Profile>("/settings/profile", { method: "PATCH", body }),
		(qc) => {
			qc.invalidateQueries({ queryKey: PROFILE_KEY });
			authClient.getSession({ query: { disableCookieCache: true } });
		},
	);
