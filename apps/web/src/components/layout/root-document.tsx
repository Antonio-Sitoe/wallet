import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { Toaster } from "@wallet/ui/components/sonner";
import { useState } from "react";

export function RootDocument() {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: { staleTime: 15_000, refetchOnWindowFocus: false },
				},
			}),
	);
	return (
		<html lang="pt" className="dark">
			<head>
				<HeadContent />
			</head>
			<body>
				<QueryClientProvider client={queryClient}>
					<Outlet />
				</QueryClientProvider>
				<Toaster richColors theme="dark" position="bottom-right" />
				<Scripts />
			</body>
		</html>
	);
}
