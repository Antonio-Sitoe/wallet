import {
	Sheet,
	SheetBody,
	SheetContent,
	SheetTitle,
} from "@wallet/ui/components/sheet";
import {
	ArrowLeftRightIcon,
	ChevronRightIcon,
	EllipsisIcon,
	LayoutDashboardIcon,
	ListChecksIcon,
	LogOutIcon,
	PlusIcon,
	SettingsIcon,
} from "lucide-react";
import { Fragment, type ReactNode, useState } from "react";
import { Link, useLocation } from "react-router";
import type { NAV } from "@/components/layout/app-shell";
import { RefreshButton } from "@/components/layout/refresh-button";
import { ThemeCycleButton } from "@/components/layout/theme-switch";
import { HideMoneyButton } from "@/components/settings/hide-money-button";
import { BrandMark } from "@/components/ui/brand-mark";
import { useOpenSettings } from "@/contexts/settings-context";

const PRIMARY = ["/dashboard", "/budget", "/transactions"] as const;

type NavItem = (typeof NAV)[number];

export function MobileTabBar({
	nav,
	userName,
	onNew,
	onSignOut,
}: {
	nav: readonly NavItem[];
	userName?: string;
	onNew: () => void;
	onSignOut: () => void;
}) {
	const { pathname } = useLocation();
	const [moreOpen, setMoreOpen] = useState(false);
	const openSettings = useOpenSettings();
	const isActive = (to: string) => pathname.startsWith(to);
	const has = (to: string) => nav.some((item) => item.to === to);
	const rest = nav.filter(
		(item) => !PRIMARY.includes(item.to as (typeof PRIMARY)[number]),
	);
	const moreActive = rest.some((item) => isActive(item.to));

	return (
		<>
			<nav
				aria-label="Navegação"
				className="border-line fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-start border-t bg-[color-mix(in_srgb,var(--color-panel)_86%,transparent)] px-2 pt-2 pb-[max(var(--safe-bottom),8px)] backdrop-blur-xl md:hidden"
			>
				<TabLink
					to="/dashboard"
					label="Início"
					active={isActive("/dashboard")}
					icon={<LayoutDashboardIcon className="size-6" strokeWidth={1.9} />}
				/>
				{has("/budget") ? (
					<TabLink
						to="/budget"
						label="Orçamento"
						active={isActive("/budget")}
						icon={<ListChecksIcon className="size-6" strokeWidth={1.9} />}
					/>
				) : (
					<span />
				)}
				<button
					type="button"
					aria-label="Nova transacção"
					onClick={onNew}
					className="flex h-[50px] cursor-pointer items-center justify-center"
				>
					<span className="bg-money text-money-ink flex size-[52px] items-center justify-center rounded-full shadow-[0_6px_20px_color-mix(in_srgb,var(--color-money)_35%,transparent)]">
						<PlusIcon className="size-6" strokeWidth={2.6} />
					</span>
				</button>
				<TabLink
					to="/transactions"
					label="Transacções"
					active={isActive("/transactions")}
					icon={<ArrowLeftRightIcon className="size-6" strokeWidth={1.9} />}
				/>
				<button
					type="button"
					onClick={() => setMoreOpen(true)}
					aria-current={moreActive ? "page" : undefined}
					className={`flex h-[50px] cursor-pointer flex-col items-center justify-center gap-[3px] text-[11px] font-medium ${moreActive ? "text-money" : "text-dim"}`}
				>
					<EllipsisIcon className="size-6" strokeWidth={1.9} />
					Mais
				</button>
			</nav>

			<Sheet open={moreOpen} onOpenChange={setMoreOpen}>
				<SheetContent className="bg-panel text-fg border-line-overlay border-t">
					<div className="flex items-center gap-3 px-4 pt-3 pb-2">
						<BrandMark />
						<div className="flex min-w-0 flex-1 flex-col">
							<SheetTitle className="text-fg">Wallet</SheetTitle>
							<span className="num text-dim truncate text-xs">
								{userName ?? "—"}
							</span>
						</div>
						<RefreshButton className="text-fg-2 hover:bg-hover flex size-11 cursor-pointer items-center justify-center rounded-full" />
						<HideMoneyButton
							iconOnly
							className="text-fg-2 hover:bg-hover size-11 cursor-pointer rounded-full"
						/>
						<ThemeCycleButton className="text-fg-2 hover:bg-hover flex size-11 cursor-pointer items-center justify-center rounded-full" />
					</div>
					<SheetBody className="flex flex-col gap-4 px-4 pt-2 pb-4">
						{groupItems(rest).map(([group, items]) => (
							<section key={group} className="flex flex-col gap-2">
								<h2 className="num text-dim px-1 text-xs tracking-[.06em] uppercase">
									{group}
								</h2>
								<div className="bg-panel-2 border-line overflow-hidden rounded-[18px] border">
									{items.map((item, i) => {
										const Icon = item.icon;
										return (
											<Fragment key={item.to}>
												{i ? <div className="bg-line ml-14 h-px" /> : null}
												<Link
													to={item.to}
													onClick={() => setMoreOpen(false)}
													aria-current={isActive(item.to) ? "page" : undefined}
													className="text-fg active:bg-hover flex min-h-[52px] items-center gap-3 px-3.5"
												>
													<span className="bg-selected flex size-8 items-center justify-center rounded-[9px]">
														<Icon
															className={`size-[18px] ${isActive(item.to) ? "text-money" : "text-fg-2"}`}
															strokeWidth={1.9}
														/>
													</span>
													<span className="flex-1 text-[15px]">{item.label}</span>
													<ChevronRightIcon className="text-faint size-4" />
												</Link>
											</Fragment>
										);
									})}
								</div>
							</section>
						))}
						<div className="bg-panel-2 border-line overflow-hidden rounded-[18px] border">
							<button
								type="button"
								onClick={() => {
									setMoreOpen(false);
									openSettings();
								}}
								className="text-fg active:bg-hover flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-3.5 text-left"
							>
								<span className="bg-selected flex size-8 items-center justify-center rounded-[9px]">
									<SettingsIcon className="text-fg-2 size-[18px]" strokeWidth={1.9} />
								</span>
								<span className="flex-1 text-[15px]">Definições</span>
								<ChevronRightIcon className="text-faint size-4" />
							</button>
							<div className="bg-line ml-14 h-px" />
							<button
								type="button"
								onClick={() => {
									setMoreOpen(false);
									onSignOut();
								}}
								className="text-danger active:bg-hover flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-3.5 text-left"
							>
								<span className="bg-danger-bg flex size-8 items-center justify-center rounded-[9px]">
									<LogOutIcon className="size-[18px]" strokeWidth={1.9} />
								</span>
								<span className="flex-1 text-[15px]">Sair</span>
							</button>
						</div>
					</SheetBody>
				</SheetContent>
			</Sheet>
		</>
	);
}

function TabLink({
	to,
	label,
	active,
	icon,
}: {
	to: string;
	label: string;
	active: boolean;
	icon: ReactNode;
}) {
	return (
		<Link
			to={to}
			aria-current={active ? "page" : undefined}
			className={`flex h-[50px] flex-col items-center justify-center gap-[3px] text-[11px] font-medium ${active ? "text-money" : "text-dim"}`}
		>
			{icon}
			{label}
		</Link>
	);
}

function groupItems(items: readonly NavItem[]) {
	const groups = new Map<string, NavItem[]>();
	for (const item of items) {
		const list = groups.get(item.group) ?? [];
		list.push(item);
		groups.set(item.group, list);
	}
	return [...groups.entries()];
}
