import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@wallet/ui/components/sonner";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/react-router/v7";
import { useEffect } from "react";
import { Outlet, useMatches } from "react-router";
import { queryClient } from "@/lib/query-client";

function usePageTitle() {
	const matches = useMatches();
	const title = matches
		.map((match) => (match.handle as { title?: string } | undefined)?.title)
		.filter(Boolean)
		.at(-1);
	useEffect(() => {
		document.title = title ? `${title} · Wallet` : "Wallet";
	}, [title]);
}

export function RootLayout() {
	usePageTitle();
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
