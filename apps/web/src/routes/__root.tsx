import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@wallet/ui/components/sonner";
import { useState } from "react";

import appCss from "../index.css?url";

export type RouterAppContext = {};

export const Route = createRootRouteWithContext<RouterAppContext>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "Wallet" },
		],
		links: [
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
			},
			{ rel: "stylesheet", href: appCss },
		],
	}),
	component: RootDocument,
});

function RootDocument() {
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
