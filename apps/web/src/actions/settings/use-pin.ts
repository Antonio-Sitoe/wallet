import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PinCheck, Preferences } from "@wallet/shared";
import { PREFERENCES_KEY } from "@/actions/settings/keys";
import { api } from "@/lib/api";

export const useSetPin = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: { pin: string; currentPin?: string }) =>
			api<Preferences>("/settings/pin", { method: "PUT", body }),
		onSuccess: (data) => qc.setQueryData(PREFERENCES_KEY, data),
	});
};

export const useRemovePin = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (pin: string) =>
			api<Preferences>("/settings/pin", { method: "DELETE", body: { pin } }),
		onSuccess: (data) => qc.setQueryData(PREFERENCES_KEY, data),
	});
};

export const useVerifyPin = () =>
	useMutation({
		mutationFn: (pin: string) =>
			api<PinCheck>("/settings/pin/verify", { method: "POST", body: { pin } }),
	});
