import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { isFirstUse } from "@/lib/first-use";

export const Route = createFileRoute("/")({
	ssr: false,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) throw redirect({ to: "/login" });
		throw redirect({ to: (await isFirstUse()) ? "/start" : "/dashboard" });
	},
});
