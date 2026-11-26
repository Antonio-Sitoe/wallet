import type { MonthBudget } from "@wallet/shared";
import {
	ArrowLeftRightIcon,
	ChevronRightIcon,
	CircleCheckIcon,
	PlusIcon,
	SparklesIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { HideMoneyButton } from "@/components/settings/hide-money-button";
import { useNewTransaction } from "@/contexts/new-transaction-context";
import { useOnline } from "@/lib/connection";
import { searchHref } from "@/lib/search-params";
import { money } from "@/utils/format";

const ACCOUNT_KIND = {
	bank: "Banco",
	mobile_wallet: "Carteira móvel",
	cash: "Dinheiro",
	savings: "Poupança",
} as const;

export function MobileHome({
	budget,
	month,
}: {
	budget: MonthBudget | undefined;
	month: string;
}) {
	const online = useOnline();
	const openNew = useNewTransaction();
	const accounts = (useAccounts().data ?? []).filter((a) => !a.archived);
	const total = accounts.reduce((sum, a) => sum + a.balance, 0);
	const totals = budget?.hasList ? budget.totals : null;
	const pct = totals?.planned
		? Math.min(100, Math.round((totals.spent / totals.planned) * 100))
		: 0;
	const due = (budget?.items ?? [])
		.filter((i) => i.status === "unpaid" || i.status === "partial")
		.sort((a, b) => b.remaining - a.remaining);
	const accountName = (id: string | null) =>
		accounts.find((a) => a.id === id)?.name;
	const budgetHref = searchHref("budget", { month });

	return (
		<div className="flex flex-col gap-6 md:hidden">
			<section
				aria-label="Saldo"
				className="bg-panel border-line flex flex-col gap-4 rounded-[24px] border p-5"
			>
				<div className="flex items-center justify-between">
					<span className="text-dim text-[13px]">
						Saldo total · {accounts.length}{" "}
						{accounts.length === 1 ? "conta" : "contas"}
					</span>
					<HideMoneyButton
						iconOnly
						className="text-dim -my-2 -mr-2.5 size-11 rounded-full"
					/>
				</div>
				<div className="flex items-baseline gap-2">
					<span
						className={`num text-[38px] leading-[44px] font-bold tracking-[-.03em] ${total < 0 ? "text-warn" : ""}`}
					>
						{money(total)}
					</span>
					<span className="text-dim text-[15px] font-semibold">MZN</span>
				</div>
				{totals ? (
					<div className="flex flex-col gap-2">
						<div className="bg-track h-2 overflow-hidden rounded-full">
							<div
								className="bg-money h-full rounded-full"
								style={{ width: `${pct}%` }}
							/>
						</div>
						<div className="grid grid-cols-3 gap-2">
							<Stat label="Planeado" value={money(totals.planned)} />
							<Stat
								label={`Gasto · ${pct}%`}
								value={money(totals.spent)}
								className="text-money-2"
							/>
							<Stat label="Falta" value={money(totals.remaining)} />
						</div>
					</div>
				) : null}
			</section>

			<nav aria-label="Acções rápidas" className="grid grid-cols-4 gap-2">
				<QuickAction
					label="Registar"
					primary
					onClick={() => openNew()}
					icon={<PlusIcon className="size-[22px]" strokeWidth={2.4} />}
				/>
				<QuickAction
					label="Transferir"
					onClick={() => openNew({ kind: "transfer" })}
					icon={
						<ArrowLeftRightIcon className="text-info-2 size-[22px]" strokeWidth={2} />
					}
				/>
				{online ? (
					<QuickAction
						label="Marcar pago"
						to={budgetHref}
						icon={
							<CircleCheckIcon className="text-money-2 size-[22px]" strokeWidth={2} />
						}
					/>
				) : null}
				{online ? (
					<QuickAction
						label="Perguntar"
						to="/assistant"
						icon={<SparklesIcon className="text-ai size-[22px]" strokeWidth={2} />}
					/>
				) : null}
			</nav>

			<section aria-label="Contas" className="flex flex-col gap-2.5">
				<div className="flex items-baseline justify-between px-1">
					<h2 className="text-[20px] font-bold tracking-[-.01em]">Contas</h2>
					<Link to="/accounts" className="text-info-2 text-[15px] no-underline">
						Ver todas
					</Link>
				</div>
				<div className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto px-4">
					{accounts.map((a) => (
						<Link
							key={a.id}
							to={searchHref("accounts", { id: a.id })}
							className="bg-panel border-line text-fg flex w-[148px] shrink-0 snap-start flex-col gap-3.5 rounded-[18px] border p-3.5 no-underline"
						>
							<span className="flex items-center gap-2">
								<span
									className="size-2.5 shrink-0 rounded-full"
									style={{ background: a.color ?? "var(--color-dim)" }}
								/>
								<span className="text-dim truncate text-xs">
									{ACCOUNT_KIND[a.type]}
								</span>
							</span>
							<span className="flex min-w-0 flex-col gap-0.5">
								<span className="truncate text-sm font-medium">{a.name}</span>
								<span
									className={`num truncate text-[17px] font-semibold ${a.balance < 0 ? "text-warn" : ""}`}
								>
									{money(a.balance)}
								</span>
							</span>
						</Link>
					))}
				</div>
			</section>

			{due.length > 0 ? (
				<section aria-label="Por pagar" className="flex flex-col gap-2.5">
					<div className="flex items-baseline justify-between px-1">
						<h2 className="text-[20px] font-bold tracking-[-.01em]">Por pagar</h2>
						<Link to={budgetHref} className="text-info-2 text-[15px] no-underline">
							{due.length} {due.length === 1 ? "item" : "itens"}
						</Link>
					</div>
					<div className="bg-panel border-line overflow-hidden rounded-[18px] border">
						{due.slice(0, 4).map((item, i) => (
							<Link
								key={item.id}
								to={budgetHref}
								className={`text-fg active:bg-hover flex min-h-[60px] items-center gap-3 px-3.5 no-underline ${i ? "border-line border-t" : ""}`}
							>
								<span className="bg-selected text-fg-2 flex size-9 shrink-0 items-center justify-center rounded-[10px] text-sm font-semibold">
									{item.name.charAt(0).toUpperCase()}
								</span>
								<span className="flex min-w-0 flex-1 flex-col gap-px">
									<span className="truncate text-[15px] font-medium">
										{item.name}
									</span>
									<span className="text-dim truncate text-xs">
										{item.status === "partial" ? "parcial" : "por pagar"}
										{accountName(item.defaultAccountId ?? item.accountId)
											? ` · ${accountName(item.defaultAccountId ?? item.accountId)}`
											: ""}
									</span>
								</span>
								<span className="num text-[15px] font-semibold">
									{money(item.remaining)}
								</span>
								<ChevronRightIcon className="text-faint size-4 shrink-0" />
							</Link>
						))}
					</div>
				</section>
			) : null}
		</div>
	);
}

function Stat({
	label,
	value,
	className = "",
}: {
	label: string;
	value: string;
	className?: string;
}) {
	return (
		<div className="flex min-w-0 flex-col gap-0.5">
			<span className="text-dim text-xs">{label}</span>
			<span className={`num truncate text-[15px] font-semibold ${className}`}>
				{value}
			</span>
		</div>
	);
}

function QuickAction({
	label,
	icon,
	primary,
	onClick,
	to,
}: {
	label: string;
	icon: ReactNode;
	primary?: boolean;
	onClick?: () => void;
	to?: string;
}) {
	const tile = (
		<>
			<span
				className={`flex size-14 items-center justify-center rounded-[18px] ${primary ? "bg-money text-money-ink" : "bg-panel border-line border"}`}
			>
				{icon}
			</span>
			{label}
		</>
	);
	const cls =
		"text-fg flex cursor-pointer flex-col items-center gap-2 text-xs no-underline";
	return to ? (
		<Link to={to} className={cls}>
			{tile}
		</Link>
	) : (
		<button type="button" onClick={onClick} className={cls}>
			{tile}
		</button>
	);
}
