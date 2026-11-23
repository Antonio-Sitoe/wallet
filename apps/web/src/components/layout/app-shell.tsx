import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
	ArrowLeftRightIcon,
	CalendarRangeIcon,
	DownloadIcon,
	LandmarkIcon,
	LayoutDashboardIcon,
	ListChecksIcon,
	LogOutIcon,
	PlusIcon,
	TagIcon,
} from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { SidebarAccounts } from "@/components/layout/sidebar-accounts";
import {
	type NewTransactionDefaults,
	NewTransactionDialog,
} from "@/components/transactions/new-transaction-dialog";
import { NewTransactionContext } from "@/contexts/new-transaction-context";
import { ApiError } from "@/lib/api";
import { authClient, clearDesktopToken } from "@/lib/auth-client";

export const NAV = [
	{ to: "/dashboard", label: "Painel", icon: LayoutDashboardIcon },
	{ to: "/budget", label: "Orçamento", icon: ListChecksIcon },
	{ to: "/plan", label: "Plano anual", icon: CalendarRangeIcon },
	{ to: "/transactions", label: "Transacções", icon: ArrowLeftRightIcon },
	{ to: "/accounts", label: "Contas", icon: LandmarkIcon },
	{ to: "/categories", label: "Categorias", icon: TagIcon },
	{ to: "/import", label: "Importar", icon: DownloadIcon },
] as const;

export const isMac =
	typeof navigator !== "undefined" &&
	/Mac|iPhone|iPad/.test(navigator.platform);

export const MOD = isMac ? "⌘" : "Ctrl+";

export function AppShell({ children }: { children: ReactNode }) {
	const navigate = useNavigate();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const { data: session } = authClient.useSession();
	const [dialog, setDialog] = useState<{
		open: boolean;
		defaults?: NewTransactionDefaults;
	}>({ open: false });

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

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
			if (e.key.toLowerCase() === "n") {
				e.preventDefault();
				openNew();
				return;
			}
			const index = Number(e.key) - 1;
			const target = NAV[index];
			if (target) {
				e.preventDefault();
				navigate({ to: target.to });
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [navigate, openNew]);

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
			<div className="bg-canvas flex min-h-svh flex-col md:flex-row">
				<nav
					aria-label="Menu principal"
					className="border-line bg-panel flex w-full flex-col gap-3 border-b px-2.5 pt-3.5 pb-3 md:sticky md:top-0 md:h-svh md:w-[232px] md:shrink-0 md:gap-[18px] md:border-r md:border-b-0"
				>
					<div className="flex items-center gap-2.5 px-1.5">
						<div className="bg-money flex size-7 items-center justify-center rounded-[7px]">
							<svg
								aria-hidden="true"
								width="17"
								height="17"
								viewBox="0 0 24 24"
								fill="none"
								stroke="#04130A"
								strokeWidth="2.2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<rect x="3" y="6" width="18" height="13" rx="2" />
								<path d="M16 12.5h2M3 9h18" />
							</svg>
						</div>
						<div className="flex min-w-0 flex-col gap-px">
							<span className="font-semibold">Wallet</span>
							<span className="num text-dim truncate text-[11px]">
								{session?.user.name ?? "—"}
							</span>
						</div>
						<button
							type="button"
							aria-label="Sair"
							className="text-fg-2 hover:bg-hover ml-auto cursor-pointer rounded-md p-2 md:hidden"
							onClick={signOut}
						>
							<LogOutIcon className="size-4" strokeWidth={1.8} />
						</button>
					</div>

					<button
						type="button"
						onClick={() => openNew()}
						className="bg-money text-money-ink hover:bg-money-2 flex h-[34px] cursor-pointer items-center gap-2 rounded-[7px] pr-2 pl-2.5 font-semibold"
					>
						<PlusIcon className="size-[15px]" strokeWidth={2.6} />
						<span className="flex-1 text-left">Nova transacção</span>
						<span className="num rounded bg-[rgba(4,19,10,.18)] px-1 text-[11px]">
							{MOD}N
						</span>
					</button>

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
											? "bg-selected text-fg flex h-[34px] shrink-0 items-center gap-2.5 rounded-md px-2 font-medium whitespace-nowrap"
											: "text-fg-2 hover:bg-hover hover:text-fg flex h-[34px] shrink-0 items-center gap-2.5 rounded-md px-2 whitespace-nowrap"
									}
								>
									<Icon
										className={active ? "text-money size-4" : "size-4"}
										strokeWidth={1.8}
									/>
									<span className="flex-1">{item.label}</span>
									<span className="num text-dim hidden text-[11px] md:inline">
										{MOD}
										{i + 1}
									</span>
								</Link>
							);
						})}
					</div>

					<SidebarAccounts />

					<div className="border-line mt-auto hidden flex-col gap-1 border-t pt-3 md:flex">
						<span className="num text-dim truncate px-2 text-[11px]">
							{session?.user.email}
						</span>
						<button
							type="button"
							className="text-fg-2 hover:bg-hover hover:text-fg flex h-[34px] cursor-pointer items-center gap-2.5 rounded-md px-2"
							onClick={signOut}
						>
							<LogOutIcon className="size-4" strokeWidth={1.8} />
							Sair
						</button>
					</div>
				</nav>

				<div className="flex min-h-svh min-w-0 flex-1 flex-col">
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
		</NewTransactionContext.Provider>
	);
}
