import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Preferences, UpdatePreferencesInput } from "@wallet/shared";
import { toast } from "sonner";
import { PREFERENCES_KEY } from "@/actions/settings/keys";
import { api, errorMessage } from "@/lib/api";

export const useUpdatePreferences = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: UpdatePreferencesInput) =>
			api<Preferences>("/settings/preferences", { method: "PATCH", body }),
		onMutate: async (body) => {
			await qc.cancelQueries({ queryKey: PREFERENCES_KEY });
			const previous = qc.getQueryData<Preferences>(PREFERENCES_KEY);
			if (previous)
				qc.setQueryData<Preferences>(PREFERENCES_KEY, {
					...previous,
					...body,
					notifications: {
						...previous.notifications,
						...body.notifications,
					},
				});
			return { previous };
		},
		onError: (error, _body, context) => {
			if (context?.previous) qc.setQueryData(PREFERENCES_KEY, context.previous);
			toast.error(errorMessage(error));
		},
		onSuccess: (data) => qc.setQueryData(PREFERENCES_KEY, data),
	});
};
