import { QueryClient } from "@tanstack/react-query";
import { isOnline } from "@/lib/connection";

const MAX_RETRIES = 3;

function retry(failureCount: number, error: unknown) {
	if (
		import.meta.env.VITE_DESKTOP === "1" &&
		(error instanceof TypeError || !isOnline())
	)
		return false;
	return failureCount < MAX_RETRIES;
}

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: { staleTime: 15_000, refetchOnWindowFocus: false, retry },
	},
});
