import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SESSIONS_KEY } from "@/actions/settings/keys";
import { authClient } from "@/lib/auth-client";

const unwrap = <T>(result: {
	data: T | null;
	error: { message?: string } | null;
}) => {
	if (result.error) throw new Error(result.error.message ?? "Erro inesperado");
	return result.data as T;
};

export const useSessions = () =>
	useQuery({
		queryKey: SESSIONS_KEY,
		queryFn: async () => unwrap(await authClient.listSessions()),
	});

export const useRevokeSession = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (token: string) =>
			unwrap(await authClient.revokeSession({ token })),
		onSuccess: () => qc.invalidateQueries({ queryKey: SESSIONS_KEY }),
	});
};

export const useRevokeOtherSessions = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async () => unwrap(await authClient.revokeOtherSessions()),
		onSuccess: () => qc.invalidateQueries({ queryKey: SESSIONS_KEY }),
	});
};
