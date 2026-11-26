import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WhatsappStatus } from "@wallet/shared";
import { WHATSAPP_KEY } from "@/actions/settings/keys";
import { api } from "@/lib/api";

export const useWhatsapp = () =>
	useQuery({
		queryKey: WHATSAPP_KEY,
		queryFn: () => api<WhatsappStatus>("/whatsapp"),
	});

export const useLinkWhatsapp = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (phone: string) =>
			api<WhatsappStatus>("/whatsapp/link", {
				method: "POST",
				body: { phone },
			}),
		onSuccess: (data) => qc.setQueryData(WHATSAPP_KEY, data),
	});
};

export const useVerifyWhatsapp = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (code: string) =>
			api<WhatsappStatus>("/whatsapp/verify", {
				method: "POST",
				body: { code },
			}),
		onSuccess: (data) => qc.setQueryData(WHATSAPP_KEY, data),
	});
};

export const useUnlinkWhatsapp = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => api<void>("/whatsapp", { method: "DELETE" }),
		onSuccess: () => qc.invalidateQueries({ queryKey: WHATSAPP_KEY }),
	});
};
