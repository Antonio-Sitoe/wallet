import { Link } from "@tanstack/react-router";
import type { DashboardCardType } from "@wallet/shared";

import {
	ACCOUNT_TYPE_LABEL,
	dayKey,
	dayLabel,
	MONTH_SHORT,
	money,
	monthLabel,
	signedMoney,
} from "@/lib/format";
import {
	type Period,
	useAccounts,
	useBalanceTrend,
	useCashflow,
	useCategories,
	useCategorySpending,
	useComparison,
	useMonthBudget,
	useOverview,
	useTransactionPages,
} from "@/lib/queries";

import {
	BarList,
	Delta,
	GroupedBars,
	Legend,
	LineChart,
	SERIES,
} from "./charts";
import { Skeleton, StatusPill } from "./kit";

/** What the "Adicionar carta" catalogue offers, grouped like Wallet's. */
export const CARD_CATALOG: Record<
	DashboardCardType,
	{ title: string; description: string; section: string }
> = {
	summary: {
		title: "Resumo",
		description:
			"Saldo total, entradas, saídas e o que falta gastar na lista do mês",
		section: "Geral",
	},
	"cash-flow": {
		title: "Fluxo de caixa",
		description: "Entradas contra saídas no período, comparado com o anterior",
		section: "Fluxo de caixa",
	},
	"cash-flow-trend": {
		title: "Entradas e saídas",
		description: "Barras por dia, semana ou mês (ou o ano inteiro)",
		section: "Fluxo de caixa",
	},
	"period-comparison": {
		title: "Comparação de períodos",
		description: "Fluxo acumulado deste período, do anterior e de há um ano",
		section: "Fluxo de caixa",
	},
	"balance-trend": {
		title: "Evolução do saldo",
		description: "Saldo total de todas as contas, dia a dia",
		section: "Saldo",
	},
	"spending-by-category": {
		title: "Onde vai o dinheiro",
		description: "Saídas por categoria principal no período",
		section: "Gastos",
	},
	accounts: {
		title: "Contas",
		description: "Saldo de cada conta",
		section: "Geral",
	},
	upcoming: {
		title: "Próximos por pagar",
		description: "Itens da lista do mês ainda por pagar",
		section: "Orçamento",
	},
	"last-records": {
		title: "Últimas transacções",
		description: "Os registos mais recentes",
		section: "Geral",
	},
};

const PeriodNote = ({ p }: { p: Period }) => (
	<span className="num text-dim text-[11px]">
		{dayLabel(p.from).split(" · ")[1]} – {dayLabel(p.to).split(" · ")[1]}
	</span>
);

const Loading = () => <Skeleton className="h-40" />;
const Empty = ({ children }: { children: React.ReactNode }) => (
	<p className="text-dim py-8 text-center">{children}</p>
);

/** The body of a card; the frame (title, menu) is drawn by the dashboard. */
export function CardBody({
	type,
	period,
	config,
}: {
	type: DashboardCardType;
	period: Period;
	config: Record<string, unknown>;
}) {
	switch (type) {
		case "summary":
			return <SummaryCard period={period} />;
		case "cash-flow":
			return <CashFlowCard period={period} />;
		case "cash-flow-trend":
			return (
				<CashFlowTrendCard
					period={config.range === "year" ? yearOf(period) : period}
				/>
			);
		case "period-comparison":
			return <ComparisonCard period={period} />;
		case "balance-trend":
			return <BalanceTrendCard period={period} />;
		case "spending-by-category":
			return (
				<CategoriesCard
					period={config.range === "year" ? yearOf(period) : period}
				/>
			);
		case "accounts":
			return <AccountsCard />;
		case "upcoming":
			return <UpcomingCard period={period} />;
		case "last-records":
			return <LastRecordsCard />;
	}
}

/** Title shown on a card, with the year when the card looks at the whole year. */
export function cardTitle(
	type: DashboardCardType,
	period: Period,
	config: Record<string, unknown>,
) {
	const base = CARD_CATALOG[type].title;
	return config.range === "year" ? `${base} · ${period.to.slice(0, 4)}` : base;
}

const yearOf = (p: Period): Period => ({
	from: `${p.to.slice(0, 4)}-01-01`,
	to: `${p.to.slice(0, 4)}-12-31`,
});
const monthOfPeriod = (p: Period) => p.to.slice(0, 7);

function SummaryCard({ period }: { period: Period }) {
	const overview = useOverview(period);
	const budget = useMonthBudget(monthOfPeriod(period));
	const accounts = useAccounts().data ?? [];
	const o = overview.data;
	const b = budget.data;
	if (!o) return <Loading />;
	const unset = accounts.filter((a) => a.initialBalance === 0 && a.balance < 0);
	const spentPct =
		b?.hasList && b.totals.planned
			? Math.round((b.totals.spent / b.totals.planned) * 100)
			: null;
	return (
		<div className="[&>*+*]:border-line grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-y-3 [&>*+*]:border-l">
			<div className="flex flex-col gap-1.5 px-4">
				<span className="num text-dim text-[11px] tracking-[.06em] uppercase">
					Saldo total · {accounts.length} contas
				</span>
				<span className="num text-[22px] whitespace-nowrap xl:text-[26px]">
					{money(o.balance.end)}{" "}
					<span className="text-dim text-[13px]">MZN</span>
				</span>
				{unset.length ? (
					<span className="text-warn text-xs">
						Sem saldos iniciais definidos
					</span>
				) : (
					<Delta now={o.balance.end} before={o.balance.start} goodWhenUp />
				)}
			</div>
			<div className="flex flex-col gap-1.5 px-4">
				<span className="num text-dim text-[11px] tracking-[.06em] uppercase">
					Entradas
				</span>
				<span className="num text-[22px] whitespace-nowrap xl:text-[26px]">{money(o.income)}</span>
				<Delta now={o.income} before={o.previousTotals.income} goodWhenUp />
			</div>
			<div className="flex flex-col gap-1.5 px-4">
				<span className="num text-dim text-[11px] tracking-[.06em] uppercase">
					Saídas
				</span>
				<span className="num text-[22px] whitespace-nowrap xl:text-[26px]">{money(o.expense)}</span>
				<Delta
					now={o.expense}
					before={o.previousTotals.expense}
					goodWhenUp={false}
				/>
			</div>
			<div className="flex flex-col gap-1.5 px-4">
				<span className="num text-dim text-[11px] tracking-[.06em] uppercase">
					Falta gastar ·{" "}
					{MONTH_SHORT[Number(monthOfPeriod(period).slice(5)) - 1]}
				</span>
				<span className="num text-[22px] whitespace-nowrap xl:text-[26px]">
					{b?.hasList ? money(b.totals.remaining) : "—"}
				</span>
				{b?.hasList ? (
					<span className="flex items-center gap-2">
						<span className="bg-hover h-1 flex-1 overflow-hidden rounded-sm">
							<span
								className="bg-money block h-1"
								style={{ width: `${Math.min(100, spentPct ?? 0)}%` }}
							/>
						</span>
						<span className="num text-dim text-[11px]">
							{spentPct}% de {money(b.totals.planned)}
						</span>
					</span>
				) : (
					<span className="text-dim text-xs">sem lista neste mês</span>
				)}
			</div>
		</div>
	);
}

function CashFlowCard({ period }: { period: Period }) {
	const o = useOverview(period).data;
	if (!o) return <Loading />;
	const max = Math.max(o.income, o.expense, 1);
	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-start justify-between gap-2">
				<div className="flex flex-col">
					<PeriodNote p={period} />
					<span className={`num text-[22px] whitespace-nowrap xl:text-[26px] ${o.net < 0 ? "text-warn" : ""}`}>
						{signedMoney(o.net)}
					</span>
				</div>
				<Delta now={o.net} before={o.previousTotals.net} goodWhenUp />
			</div>
			{[
				{ label: "Entradas", value: o.income, color: SERIES.income },
				{ label: "Saídas", value: o.expense, color: SERIES.expense },
			].map((r) => (
				<div key={r.label} className="flex flex-col gap-1.5">
					<div className="flex justify-between">
						<span className="text-fg-2">{r.label}</span>
						<span className="num">{money(r.value)}</span>
					</div>
					<span className="bg-hover h-2.5 overflow-hidden rounded-full">
						<span
							className="block h-2.5 rounded-full"
							style={{
								width: `${(r.value / max) * 100}%`,
								background: r.color,
							}}
						/>
					</span>
				</div>
			))}
		</div>
	);
}

function CashFlowTrendCard({ period }: { period: Period }) {
	const trend = useCashflow(period).data;
	if (!trend) return <Loading />;
	const label = (start: string) =>
		trend.bucket === "month"
			? MONTH_SHORT[Number(start.slice(5, 7)) - 1]!
			: `${Number(start.slice(8))} ${MONTH_SHORT[Number(start.slice(5, 7)) - 1]}`;
	const income = trend.points.reduce((s, p) => s + p.income, 0);
	const expense = trend.points.reduce((s, p) => s + p.expense, 0);
	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<span className="num text-fg-2 text-xs">
					entradas {money(income)} · saídas {money(expense)}
				</span>
				<Legend
					items={[
						{ label: "entradas", color: SERIES.income },
						{ label: "saídas", color: SERIES.expense },
					]}
				/>
			</div>
			<GroupedBars
				label="Entradas e saídas por período"
				series={[
					{ label: "Entradas", color: SERIES.income },
					{ label: "Saídas", color: SERIES.expense },
				]}
				points={trend.points.map((p) => ({
					label: label(p.start),
					title:
						trend.bucket === "month"
							? monthLabel(p.start.slice(0, 7))
							: `${dayLabel(p.start)}${p.end !== p.start ? ` – ${dayLabel(p.end)}` : ""}`,
					values: [p.income, p.expense],
				}))}
			/>
		</div>
	);
}

function ComparisonCard({ period }: { period: Period }) {
	const points = useComparison(period).data;
	if (!points) return <Loading />;
	const short = (d: string) =>
		`${Number(d.slice(8))} ${MONTH_SHORT[Number(d.slice(5, 7)) - 1]}`;
	return (
		<div className="flex flex-col gap-3">
			<span className="text-fg-2 text-xs">
				Entradas − saídas, acumulado desde o início de cada período
			</span>
			<LineChart
				label="Fluxo acumulado: este período, o anterior e há um ano"
				xLabels={points.map((p) => short(p.date))}
				titles={points.map((p) => `dia ${p.day} · ${dayLabel(p.date)}`)}
				series={[
					{
						label: "Este período",
						color: SERIES.current,
						values: points.map((p) => p.current),
					},
					{
						label: "Período anterior",
						color: SERIES.previous,
						values: points.map((p) => p.previous),
					},
					{
						label: "Há um ano",
						color: SERIES.yearAgo,
						values: points.map((p) => p.yearAgo),
					},
				]}
			/>
			<Legend
				items={[
					{ label: "este período", color: SERIES.current, line: true },
					{ label: "período anterior", color: SERIES.previous, line: true },
					{ label: "há um ano", color: SERIES.yearAgo, line: true },
				]}
			/>
		</div>
	);
}

function BalanceTrendCard({ period }: { period: Period }) {
	const points = useBalanceTrend(period).data;
	if (!points) return <Loading />;
	const first = points[0]?.balance ?? 0;
	const last = points.at(-1)?.balance ?? 0;
	const short = (d: string) =>
		`${Number(d.slice(8))} ${MONTH_SHORT[Number(d.slice(5, 7)) - 1]}`;
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-start justify-between gap-2">
				<div className="flex flex-col">
					<PeriodNote p={period} />
					<span className="num text-[22px] whitespace-nowrap xl:text-[26px]">{money(last)}</span>
				</div>
				<Delta now={last} before={first} goodWhenUp />
			</div>
			<LineChart
				area
				label="Saldo total ao longo do período"
				xLabels={points.map((p) => short(p.date))}
				titles={points.map((p) => dayLabel(p.date))}
				series={[
					{
						label: "Saldo",
						color: SERIES.current,
						values: points.map((p) => p.balance),
					},
				]}
			/>
		</div>
	);
}

function CategoriesCard({ period }: { period: Period }) {
	const data = useCategorySpending(period).data;
	if (!data) return <Loading />;
	if (data.total === 0) return <Empty>Sem saídas neste período.</Empty>;
	const rows = data.items.map((i) => ({
		key: i.categoryId ?? "none",
		name: i.name,
		value: i.expense,
		dot: i.color,
		note: `${Math.round(i.share * 100)}% · anterior ${money(i.previousExpense)}`,
	}));
	if (data.others > 0)
		rows.push({
			key: "others",
			name: "Outras",
			value: data.others,
			dot: null,
			note: "",
		});
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-start justify-between gap-2">
				<div className="flex flex-col">
					<PeriodNote p={period} />
					<span className="num text-[22px]">{money(data.total)}</span>
				</div>
				<Delta
					now={data.total}
					before={data.previousTotal}
					goodWhenUp={false}
				/>
			</div>
			<BarList label="Saídas por categoria" rows={rows} />
		</div>
	);
}

function AccountsCard() {
	const accounts = useAccounts().data;
	if (!accounts) return <Loading />;
	if (accounts.length === 0) return <Empty>Ainda não há contas.</Empty>;
	return (
		<table className="w-full border-collapse">
			<thead>
				<tr>
					{["Conta", "Tipo", "Saldo"].map((h, i) => (
						<th
							key={h}
							scope="col"
							className={`num border-line text-dim border-b pb-2 text-[11px] font-medium tracking-[.06em] uppercase ${i === 2 ? "text-right" : "text-left"}`}
						>
							{h}
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{[...accounts]
					.sort((a, b) => b.balance - a.balance)
					.map((a) => (
						<tr key={a.id} className="border-hover border-b last:border-0">
							<td className="py-2">
								<Link
									to="/contas"
									search={{ id: a.id }}
									className="text-fg flex items-center gap-2 no-underline hover:underline"
								>
									<span
										aria-hidden="true"
										className="size-2 rounded-sm"
										style={{ background: a.color ?? "#8B949E" }}
									/>
									{a.name}
								</Link>
							</td>
							<td className="text-fg-2 py-2 text-xs">
								{ACCOUNT_TYPE_LABEL[a.type]}
							</td>
							<td
								className={`num py-2 text-right ${a.balance < 0 ? "text-warn" : ""}`}
							>
								{money(a.balance)}
							</td>
						</tr>
					))}
			</tbody>
		</table>
	);
}

function UpcomingCard({ period }: { period: Period }) {
	const month = monthOfPeriod(period);
	const budget = useMonthBudget(month).data;
	if (!budget) return <Loading />;
	if (!budget.hasList)
		return <Empty>Sem lista para {monthLabel(month)}.</Empty>;
	const items = budget.items
		.filter((i) => i.status === "unpaid" || i.status === "partial")
		.sort((a, b) => b.remaining - a.remaining);
	if (items.length === 0)
		return (
			<p className="text-money py-8 text-center">
				Tudo pago em {monthLabel(month)}.
			</p>
		);
	return (
		<ul className="flex flex-col gap-2">
			{items.slice(0, 6).map((i) => (
				<li key={i.id}>
					<Link
						to="/orcamento"
						search={{ mes: month }}
						className="border-line text-fg hover:bg-hover flex items-center gap-3 rounded-lg border px-3 py-2.5 no-underline"
					>
						<span
							aria-hidden="true"
							className="size-[18px] rounded-[5px] border-[1.5px] border-[#6E7681]"
						/>
						<span className="min-w-0 flex-1 truncate">{i.name}</span>
						{i.status === "partial" ? <StatusPill status="partial" /> : null}
						<span className="num">{money(i.remaining)}</span>
					</Link>
				</li>
			))}
			{items.length > 6 ? (
				<li className="num text-dim text-center text-[11px]">
					+ {items.length - 6} itens
				</li>
			) : null}
		</ul>
	);
}

function LastRecordsCard() {
	const page = useTransactionPages({}, 6).data?.pages[0]?.items;
	const categories = useCategories().data ?? [];
	const accounts = useAccounts().data ?? [];
	if (!page) return <Loading />;
	if (page.length === 0) return <Empty>Ainda não há transacções.</Empty>;
	return (
		<ul className="flex flex-col">
			{page.map((t) => {
				const c = categories.find((x) => x.id === t.categoryId);
				return (
					<li key={t.id} className="border-hover border-b last:border-0">
						<Link
							to="/transacoes"
							search={{ id: t.id }}
							className="text-fg hover:bg-hover flex items-center gap-3 py-2 no-underline"
						>
							<span
								aria-hidden="true"
								className="num flex size-7 items-center justify-center rounded-md text-xs font-semibold"
								style={{
									background: `${c?.color ?? "#8B949E"}24`,
									color: c?.color ?? "#8B949E",
								}}
							>
								{t.type === "transfer" ? "⇄" : (c?.name[0] ?? "?")}
							</span>
							<span className="flex min-w-0 flex-1 flex-col">
								<span className="truncate">
									{t.type === "transfer"
										? "Transferência"
										: (c?.name ?? "Sem categoria")}
								</span>
								<span className="num text-dim text-[11px]">
									{accounts.find((a) => a.id === t.accountId)?.name} ·{" "}
									{dayLabel(dayKey(t.occurredAt))}
								</span>
							</span>
							<span
								className={`num ${t.amount > 0 && t.type !== "transfer" ? "text-money" : ""}`}
							>
								{signedMoney(t.amount)}
							</span>
						</Link>
					</li>
				);
			})}
		</ul>
	);
}
