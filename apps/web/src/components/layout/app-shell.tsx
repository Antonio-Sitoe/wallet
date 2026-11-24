import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "@wallet/ui/components/button";
import {
	ArrowLeftRightIcon,
	CalendarCheckIcon,
	CalendarRangeIcon,
	ChartColumnIcon,
	DownloadIcon,
	HandCoinsIcon,
	LandmarkIcon,
	LayoutDashboardIcon,
	ListChecksIcon,
	LogOutIcon,
	PlusIcon,
	SearchIcon,
	SettingsIcon,
	ShoppingCartIcon,
	SparklesIcon,
	TagIcon,
	TargetIcon,
} from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { toast } from "sonner";
import {
	CommandPalette,
	type PaletteMode,
} from "@/components/assistant/command-palette";
import {
	ThemeCycleButton,
	useThemeShortcut,
} from "@/components/layout/theme-switch";
import { UserMenu } from "@/components/layout/user-menu";
import { HideMoneyButton } from "@/components/settings/hide-money-button";
import { NotificationsRunner } from "@/components/settings/notifications-runner";
import {
	type NewTransactionDefaults,
	NewTransactionDialog,
} from "@/components/transactions/new-transaction-dialog";
import { BrandMark } from "@/components/ui/brand-mark";
import { NewTransactionContext } from "@/contexts/new-transaction-context";
import { usePreferencesContext } from "@/contexts/preferences-context";
import { useOpenSettings } from "@/contexts/settings-context";
import { ApiError } from "@/lib/api";
import { authClient, clearDesktopToken } from "@/lib/auth-client";
import { formatCombo, useShortcutMap, useShortcuts } from "@/lib/shortcuts";

export const NAV = [
	{ to: "/dashboard", label: "Painel", icon: LayoutDashboardIcon },
	{ to: "/budget", label: "Orçamento", icon: ListChecksIcon },
	{ to: "/payments", label: "Pagamentos", icon: CalendarCheckIcon },
	{ to: "/plan", label: "Plano anual", icon: CalendarRangeIcon },
	{ to: "/transactions", label: "Transacções", icon: ArrowLeftRightIcon },
	{ to: "/accounts", label: "Contas", icon: LandmarkIcon },
	{ to: "/categories", label: "Categorias", icon: TagIcon },
	{ to: "/import", label: "Importar", icon: DownloadIcon },
	{ to: "/goals", label: "Metas", icon: TargetIcon },
	{ to: "/debts", label: "Dívidas", icon: HandCoinsIcon },
	{ to: "/shopping", label: "Compras", icon: ShoppingCartIcon },
	{ to: "/stats", label: "Estatísticas", icon: ChartColumnIcon },
	{ to: "/assistant", label: "Assistente", icon: SparklesIcon },
] as const;

export const isMac =
	typeof navigator !== "undefined" &&
	/Mac|iPhone|iPad/.test(navigator.platform);

export const MOD = isMac ? "⌘" : "Ctrl+";

export function AppShell({ children }: { children: ReactNode }) {
	const navigate = useNavigate();
	useThemeShortcut();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const { data: session } = authClient.useSession();
	const openSettings = useOpenSettings();
	const [dialog, setDialog] = useState<{
		open: boolean;
		defaults?: NewTransactionDefaults;
	}>({ open: false });
	const [palette, setPalette] = useState<{ open: boolean; mode: PaletteMode }>({
		open: false,
		mode: "search",
	});

	const openNew = useCallback(
		(defaults?: NewTransactionDefaults) => setDialog({ open: true, defaults }),
		[],
	);

	useEffect(() => {
		const onRejection = (e: PromiseRejectionEvent) => {
			if (e.reason instanceof ApiError) e.preventDefault();
		};
		window.addEventListener("unhandledrejection", onRejection);
		return () => window.removeEventListener("unhandledrejection", onRejection);
	}, []);

	const { preferences, update } = usePreferencesContext();
	const keys = useShortcutMap();
	const go = (index: number) => () => {
		const target = NAV[index];
		if (target) navigate({ to: target.to });
	};
	useShortcuts({
		newTransaction: () => openNew(),
		palette: () => setPalette((p) => ({ open: !p.open, mode: "search" })),
		assistant: () => {
			setPalette((p) => ({ ...p, open: false }));
			navigate({ to: "/assistant" });
		},
		hideMoney: () => {
			if (!preferences) return;
			const hideMoney = !preferences.hideMoney;
			update({ hideMoney });
			toast(hideMoney ? "Valores ocultos" : "Valores visíveis");
		},
		nav1: go(0),
		nav2: go(1),
		nav3: go(2),
		nav4: go(3),
		nav5: go(4),
		nav6: go(5),
		nav7: go(6),
		nav8: go(7),
		nav9: go(8),
		nav10: go(9),
	});

	const value = useMemo(() => openNew, [openNew]);
	const signOut = () =>
		authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					clearDesktopToken();
					navigate({ to: "/login" });
				},
			},
		});

	return (
		<NewTransactionContext.Provider value={value}>
			<a
				href="#conteudo"
				className="bg-fg text-canvas rounded-control sr-only z-50 text-[13px] font-medium shadow-lg focus:not-sr-only focus:px-3 focus:py-2 focus:fixed focus:top-3 focus:left-3"
			>
				Saltar para o conteúdo
			</a>
			<div className="bg-canvas flex min-h-svh flex-col md:flex-row">
				<nav
					aria-label="Menu principal"
					className="border-line bg-panel md:w-sidebar flex w-full flex-col gap-3 border-b px-2.5 pt-3.5 pb-3 md:sticky md:top-0 md:h-svh md:shrink-0 md:gap-[18px] md:border-r md:border-b-0"
				>
					<div className="flex items-center gap-2.5 px-1.5">
						<BrandMark />
						<div className="flex min-w-0 flex-col gap-px">
							<span className="font-semibold">Wallet</span>
							<span className="num text-dim truncate text-[11px]">
								{session?.user.name ?? "—"}
							</span>
						</div>
						<HideMoneyButton
							iconOnly
							className="text-fg-2 hover:bg-hover ml-auto cursor-pointer rounded-md p-2 md:hidden"
						/>
						<ThemeCycleButton className="text-fg-2 hover:bg-hover cursor-pointer rounded-md p-2 md:hidden" />
						<Button
							variant="quiet"
							size="icon-sm"
							aria-label="Definições"
							className="text-fg-2 hover:bg-hover cursor-pointer rounded-md p-2 md:hidden"
							onClick={() => openSettings()}
						>
							<SettingsIcon className="size-4" strokeWidth={1.8} />
						</Button>
						<Button
							variant="quiet"
							size="icon-sm"
							aria-label="Sair"
							className="text-fg-2 hover:bg-hover cursor-pointer rounded-md p-2 md:hidden"
							onClick={signOut}
						>
							<LogOutIcon className="size-4" strokeWidth={1.8} />
						</Button>
					</div>

					<Button
						variant="primary"
						onClick={() => openNew()}
						className="bg-money text-money-ink hover:bg-money-2 h-input rounded-control flex cursor-pointer items-center gap-2 pr-2 pl-2.5 font-semibold"
					>
						<PlusIcon className="size-[15px]" strokeWidth={2.6} />
						<span className="flex-1 text-left">Nova transacção</span>
						<span className="num bg-money-ink/18 rounded px-1 text-[11px]">
							{formatCombo(keys.newTransaction)}
						</span>
					</Button>
					<Button
						variant="neutral"
						onClick={() => setPalette({ open: true, mode: "search" })}
						className="text-dim hover:text-fg h-input rounded-control hidden cursor-pointer items-center gap-2 pr-2 pl-2.5 font-normal md:flex"
					>
						<SearchIcon className="size-[15px]" strokeWidth={2} />
						<span className="flex-1 text-left">Procurar ou perguntar</span>
						<span className="num text-[11px]">{formatCombo(keys.palette)}</span>
					</Button>

					<div className="flex gap-0.5 overflow-x-auto md:flex-col">
						<div className="num text-dim hidden px-2 pb-1.5 text-[11px] tracking-[.06em] uppercase md:block">
							Workspace
						</div>
						{NAV.map((item, i) => {
							const active = pathname.startsWith(item.to);
							const Icon = item.icon;
							return (
								<Link
									key={item.to}
									to={item.to}
									aria-current={active ? "page" : undefined}
									className={
										active
											? "bg-selected text-fg h-input flex shrink-0 items-center gap-2.5 rounded-md px-2 font-medium whitespace-nowrap"
											: "text-fg-2 hover:bg-hover hover:text-fg h-input flex shrink-0 items-center gap-2.5 rounded-md px-2 whitespace-nowrap"
									}
								>
									<Icon
										className={active ? "text-money size-4" : "size-4"}
										strokeWidth={1.8}
									/>
									<span className="flex-1">{item.label}</span>
									{i < 10 ? (
										<span className="num text-dim hidden text-[11px] md:inline">
											{formatCombo(keys[`nav${i + 1}` as keyof typeof keys])}
										</span>
									) : null}
								</Link>
							);
						})}
					</div>

					<div className="border-line mt-auto hidden border-t pt-3 md:block">
						<UserMenu mod={MOD} onSignOut={signOut} />
					</div>
				</nav>

				<div
					id="conteudo"
					tabIndex={-1}
					className="flex min-h-svh min-w-0 flex-1 flex-col outline-none"
				>
					{children}
					<footer className="num border-line bg-panel text-dim mt-auto flex min-h-7 flex-wrap items-center gap-4 border-t px-4 text-[11px]">
						<span className="inline-flex items-center gap-1.5">
							<span className="bg-money inline-block size-[7px] rounded-full" />
							ligado
						</span>
						<span className="ml-auto">v0.1 · mvp</span>
					</footer>
				</div>
			</div>
			<NewTransactionDialog
				open={dialog.open}
				defaults={dialog.defaults}
				onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
			/>
			<NotificationsRunner />
			<CommandPalette
				open={palette.open}
				mode={palette.mode}
				onOpenChange={(open) => setPalette((p) => ({ ...p, open }))}
			/>
		</NewTransactionContext.Provider>
	);
}
