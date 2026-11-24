import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { Toaster } from "@wallet/ui/components/sonner";
import { ThemeProvider } from "next-themes";
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
		<html lang="pt" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
					storageKey="wallet.theme"
				>
					<QueryClientProvider client={queryClient}>
						<Outlet />
					</QueryClientProvider>
					<Toaster richColors position="bottom-right" />
				</ThemeProvider>
				<Scripts />
			</body>
		</html>
	);
}
