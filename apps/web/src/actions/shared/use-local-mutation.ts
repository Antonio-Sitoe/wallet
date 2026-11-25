import { useCallback, useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/api";

export function useLocalMutation<TVars, TResult>(
	fn: (vars: TVars) => Promise<TResult>,
) {
	const [isPending, setPending] = useState(false);
	const mutateAsync = useCallback(
		async (vars: TVars) => {
			setPending(true);
			try {
				return await fn(vars);
			} catch (error) {
				toast.error(errorMessage(error));
				throw error;
			} finally {
				setPending(false);
			}
		},
		[fn],
	);
	return { mutateAsync, isPending };
}
