import { Outlet } from "@tanstack/react-router";
import { ConfirmProvider } from "@/components/feedback/confirm-provider";
import { AppShell } from "@/components/layout/app-shell";

export function AuthLayout() {
	return (
		<ConfirmProvider>
			<AppShell>
				<Outlet />
			</AppShell>
		</ConfirmProvider>
	);
}
