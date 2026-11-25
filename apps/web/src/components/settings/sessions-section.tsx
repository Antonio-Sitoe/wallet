import { Button } from "@wallet/ui/components/button";
import { MonitorIcon, SmartphoneIcon } from "lucide-react";
import { toast } from "sonner";
import {
	useRevokeOtherSessions,
	useRevokeSession,
	useSessions,
} from "@/actions/settings/use-sessions";
import {
	SettingsRow,
	SettingsSection,
} from "@/components/settings/settings-row";
import { errorMessage } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

function detectOs(ua: string) {
	if (/iPhone|iPad/.test(ua)) return "iOS";
	if (/Android/.test(ua)) return "Android";
	if (/Windows/.test(ua)) return "Windows";
	if (/Mac OS X|Macintosh/.test(ua)) return "macOS";
	if (/Linux/.test(ua)) return "Linux";
	return null;
}

function detectClient(ua: string) {
	if (/Edg\//.test(ua)) return "Edge";
	if (/Firefox\//.test(ua)) return "Firefox";
	if (/Chrome\//.test(ua)) return "Chrome";
	if (/Safari\//.test(ua)) return "Safari";
	if (/AppleWebKit/.test(ua)) return "App de desktop";
	return "Navegador";
}

function describeDevice(ua: string | null | undefined) {
	if (!ua) return { label: "Dispositivo desconhecido", mobile: false };
	const os = detectOs(ua);
	const client = detectClient(ua);
	return {
		label: os ? `${client} · ${os}` : client,
		mobile: os === "iOS" || os === "Android",
	};
}

const relative = new Intl.RelativeTimeFormat("pt-PT", { numeric: "auto" });

function lastActive(date: Date | string) {
	const minutes = Math.round((new Date(date).getTime() - Date.now()) / 60_000);
	if (minutes > -2) return "activa agora";
	if (minutes > -60) return `activa ${relative.format(minutes, "minute")}`;
	const hours = Math.round(minutes / 60);
	if (hours > -24) return `activa ${relative.format(hours, "hour")}`;
	return `activa ${relative.format(Math.round(hours / 24), "day")}`;
}

export function SessionsSection() {
	const { data: current } = authClient.useSession();
	const { data: sessions, isPending, error } = useSessions();
	const revoke = useRevokeSession();
	const revokeOthers = useRevokeOtherSessions();
	const currentId = current?.session.id;
	const sorted = [...(sessions ?? [])].sort((a, b) =>
		a.id === currentId
			? -1
			: b.id === currentId
				? 1
				: new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
	);
	const others = sorted.filter((s) => s.id !== currentId).length;

	async function end(token: string) {
		try {
			await revoke.mutateAsync(token);
			toast.success("Sessão terminada");
		} catch (e) {
			toast.error(errorMessage(e));
		}
	}

	async function endOthers() {
		try {
			await revokeOthers.mutateAsync();
			toast.success("Sessões terminadas nos outros dispositivos");
		} catch (e) {
			toast.error(errorMessage(e));
		}
	}

	return (
		<SettingsSection
			title="Sessões activas"
			description="Dispositivos com sessão iniciada na sua conta. Uma sessão dura um ano e renova-se enquanto usa o app. Termine as que não reconhece."
		>
			{isPending ? (
				<p className="text-dim py-3.5 text-[12px]">A carregar…</p>
			) : error ? (
				<p role="alert" className="text-danger py-3.5 text-[12px]">
					{errorMessage(error)}
				</p>
			) : (
				sorted.map((session) => {
					const device = describeDevice(session.userAgent);
					const isCurrent = session.id === currentId;
					const Icon = device.mobile ? SmartphoneIcon : MonitorIcon;
					return (
						<SettingsRow
							key={session.id}
							title={
								<span className="inline-flex items-center gap-2">
									<Icon className="text-dim size-3.5" />
									{device.label}
									{isCurrent ? (
										<span className="bg-money-bg text-money rounded-full px-2 py-px text-[11px]">
											este dispositivo
										</span>
									) : null}
								</span>
							}
							description={[lastActive(session.updatedAt), session.ipAddress]
								.filter(Boolean)
								.join(" · ")}
						>
							{isCurrent ? null : (
								<Button
									variant="quiet"
									disabled={revoke.isPending}
									onClick={() => end(session.token)}
								>
									Terminar
								</Button>
							)}
						</SettingsRow>
					);
				})
			)}
			{others > 0 ? (
				<SettingsRow
					title="Terminar as outras sessões"
					description="Mantém só este dispositivo com sessão iniciada."
				>
					<Button
						variant="danger"
						disabled={revokeOthers.isPending}
						onClick={endOthers}
					>
						Terminar {others} {others === 1 ? "sessão" : "sessões"}
					</Button>
				</SettingsRow>
			) : null}
		</SettingsSection>
	);
}
