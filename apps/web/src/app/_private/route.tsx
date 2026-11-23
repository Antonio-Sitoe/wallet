import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthLayout } from "@/components/layout/auth-layout";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_private")({
	ssr: false,
	component: AuthLayout,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			throw redirect({ to: "/login" });
		}
		return { session };
	},
});
