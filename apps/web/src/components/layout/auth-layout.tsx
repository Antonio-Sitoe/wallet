import { Outlet } from "@tanstack/react-router";
import { TooltipProvider } from "@wallet/ui/components/tooltip";
import { ConfirmProvider } from "@/components/feedback/confirm-provider";
import { AppShell } from "@/components/layout/app-shell";

export function AuthLayout() {
	return (
		<TooltipProvider delay={300}>
			<ConfirmProvider>
				<AppShell>
					<Outlet />
				</AppShell>
			</ConfirmProvider>
		</TooltipProvider>
	);
}
