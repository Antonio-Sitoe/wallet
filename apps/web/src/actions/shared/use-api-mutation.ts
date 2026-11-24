import {
	type QueryClient,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { errorMessage } from "@/lib/api";

export function useApiMutation<TVars, TResult>(
	fn: (vars: TVars) => Promise<TResult>,
	onDone: (qc: QueryClient) => void,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: fn,
		onSuccess: () => onDone(qc),
		onError: (error) => toast.error(errorMessage(error)),
	});
}
