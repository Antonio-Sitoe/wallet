import { Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";

export function AuthLayout() {
	return (
		<AppShell>
			<Outlet />
		</AppShell>
	);
}
