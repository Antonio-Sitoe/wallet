import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@wallet/ui/components/sonner";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/react-router/v7";
import { useState } from "react";
import { Outlet } from "react-router";

export function RootLayout() {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: { staleTime: 15_000, refetchOnWindowFocus: false },
				},
			}),
	);
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
			storageKey="wallet.theme"
		>
			<NuqsAdapter>
				<QueryClientProvider client={queryClient}>
					<Outlet />
				</QueryClientProvider>
			</NuqsAdapter>
			<Toaster richColors position="bottom-right" />
		</ThemeProvider>
	);
}
