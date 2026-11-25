import { TooltipProvider } from "@wallet/ui/components/tooltip";
import { Outlet } from "react-router";
import { ConfirmProvider } from "@/components/feedback/confirm-provider";
import { AppShell } from "@/components/layout/app-shell";
import { PinGate } from "@/components/settings/pin-gate";
import {
	DisplayBoundary,
	PreferencesProvider,
} from "@/components/settings/preferences-provider";
import { SettingsProvider } from "@/components/settings/settings-provider";

export function AuthLayout() {
	return (
		<TooltipProvider delay={300}>
			<ConfirmProvider>
				<PreferencesProvider>
					<PinGate>
						<SettingsProvider>
							<AppShell>
								<DisplayBoundary>
									<Outlet />
								</DisplayBoundary>
							</AppShell>
						</SettingsProvider>
					</PinGate>
				</PreferencesProvider>
			</ConfirmProvider>
		</TooltipProvider>
	);
}
