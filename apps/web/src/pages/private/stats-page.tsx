import type {
	BreakdownDimension,
	BreakdownSlice,
	MoneyFlow,
} from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Skeleton } from "@wallet/ui/components/skeleton";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { Period } from "@/@types/period";
import { useBreakdown } from "@/actions/analytics/use-breakdown";
import { useCashflow } from "@/actions/analytics/use-cashflow";
import { useFirstDay } from "@/actions/analytics/use-first-day";
import { useOverview } from "@/actions/analytics/use-overview";
import { Delta } from "@/components/charts/delta";
import { GroupedBars } from "@/components/charts/grouped-bars";
import { SERIES } from "@/components/charts/series";
import { Ranking, type RowLink } from "@/components/stats/ranking";
import { Card } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card-header";
import { ErrorNote } from "@/components/ui/error-note";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { PageTitle } from "@/components/ui/page-title";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { usePageNavigate, usePageSearch } from "@/lib/search-params";
import {
	KINDS,
	type Kind,
	periodLabel,
	periodOf,
	shift,
} from "@/pages/private/dashboard-page";
import {
	currentMonth,
	dayLabel,
	MONTH_SHORT,
	money,
	monthLabel,
	todayInput,
} from "@/utils/format";

const VIEWS: { value: BreakdownDimension; label: string }[] = [
	{ value: "category", label: "Categorias" },
	{ value: "payee", label: "Pessoas" },
	{ value: "label", label: "Etiquetas" },
	{ value: "account", label: "Contas" },
];

const FLOWS: { value: MoneyFlow; label: string }[] = [
	{ value: "expense", label: "Saídas" },
	{ value: "income", label: "Entradas" },
];

const EMPTY_TEXT: Record<BreakdownDimension, string> = {
	category: "Sem movimentos neste período.",
	account: "Sem movimentos neste período.",
	payee:
		"Nenhuma transacção com pessoa neste período. Escreva a pessoa no campo Pessoa ao registar ou editar uma transacção.",
	label:
		"Nenhuma transacção com etiquetas neste período. Junte etiquetas (Obra, Festa, nomes…) ao registar ou editar uma transacção.",
};

type StatsKind = Kind | "all";

const STATS_KINDS: Record<StatsKind, string> = { ...KINDS, all: "tudo" };

function yearsBetween(p: Period) {
	return Number(p.to.slice(0, 4)) - Number(p.from.slice(0, 4));
}

function transactionsPeriod(
	kind: StatsKind,
	period: Period,
): RowLink["search"] {
	if (kind === "year" && period.from.slice(0, 4) === todayInput().slice(0, 4))
		return { period: "year" };
	if (kind === "month" && period.from.slice(0, 7) === currentMonth())
		return { period: "month" };
	return { period: "all" };
}

export function StatsPage() {
	const search = usePageSearch("stats");
	const navigate = usePageNavigate("stats");
	const kind: StatsKind = search.period ?? "year";
	const all = kind === "all";
	const firstDay = useFirstDay(all);
	const today = todayInput();
	const period: Period = all
		? { from: firstDay.data?.day ?? today, to: today }
		: periodOf(kind, search.from);
	const label = all
		? firstDay.data?.day
			? `desde ${firstDay.data.day.slice(0, 4)}`
			: "tudo"
		: periodLabel(kind, period);
	const by = search.by ?? "category";
	const flow = search.flow ?? "expense";
	const set = (patch: Partial<typeof search>) =>
		navigate({ search: (s) => ({ ...s, ...patch }) });

	const linkOf = (slice: BreakdownSlice): RowLink | null => {
		if (!slice.id) return null;
		const base = { ...transactionsPeriod(kind, period), type: flow };
		if (by === "category") return { search: { ...base, category: slice.id } };
		if (by === "account") return { search: { ...base, account: slice.id } };
		if (by === "payee") return { search: { ...base, payee: slice.name } };
		return { search: { ...base, label: slice.name } };
	};

	return (
		<>
			<PageHeader crumb={["estatísticas"]}>
				<div className="flex items-center gap-1">
					{all ? null : (
						<Button
							variant="neutral"
							aria-label="Período anterior"
							className="w-[30px] px-0"
							onClick={() => set({ from: shift(kind, period, -1) })}
						>
							<ChevronLeftIcon className="size-4" />
						</Button>
					)}
					<Select
						size="md"
						aria-label="Tipo de período"
						className="num w-auto"
						value={kind}
						onValueChange={(value) =>
							set({ period: value as StatsKind, from: undefined })
						}
						items={(Object.keys(STATS_KINDS) as StatsKind[]).map((k) => ({
							value: k,
							label: `período: ${STATS_KINDS[k]}`,
						}))}
					/>
					<span className="num min-w-[120px] px-2 text-center text-xs whitespace-nowrap">
						{label}
					</span>
					{all ? null : (
						<Button
							variant="neutral"
							aria-label="Período seguinte"
							className="w-[30px] px-0"
							onClick={() => set({ from: shift(kind, period, 1) })}
						>
							<ChevronRightIcon className="size-4" />
						</Button>
					)}
				</div>
			</PageHeader>
			<Page>
				<PageTitle
					title="Estatísticas"
					meta={
						all
							? `${label} · todas as transacções`
							: `${label.toLowerCase()} · comparado com o período anterior`
					}
				/>
				{all && !firstDay.data ? (
					firstDay.error ? (
						<ErrorNote error={firstDay.error} />
					) : (
						<Skeleton className="rounded-card h-[104px]" />
					)
				) : (
					<StatsBody
						kind={kind}
						period={period}
						by={by}
						flow={flow}
						set={set}
						linkOf={linkOf}
					/>
				)}
			</Page>
		</>
	);
}

function evolutionBucket(kind: StatsKind, period: Period) {
	if (kind === "all") return yearsBetween(period) >= 3 ? "year" : "month";
	return kind === "year" ? "month" : "week";
}

function StatsBody({
	kind,
	period,
	by,
	flow,
	set,
	linkOf,
}: {
	kind: StatsKind;
	period: Period;
	by: BreakdownDimension;
	flow: MoneyFlow;
	set: (patch: { by?: BreakdownDimension; flow?: MoneyFlow }) => void;
	linkOf: (slice: BreakdownSlice) => RowLink | null;
}) {
	const all = kind === "all";
	const bucket = evolutionBucket(kind, period);
	return (
		<>
				<Totals period={period} compare={!all} />
				<Card>
					<CardHeader
						title="Evolução"
						meta={`entradas e saídas por ${BUCKET_LABEL[bucket]}`}
					/>
					<div className="p-3.5">
						<Evolution period={period} bucket={bucket} />
					</div>
				</Card>
				<Card>
					<CardHeader
						title="Para onde vai e de onde vem"
						meta="clique numa linha para ver as transacções"
						actions={
							<>
								<Segmented
									value={by}
									options={VIEWS}
									onChange={(value) => set({ by: value })}
								/>
								<Segmented
									value={flow}
									options={FLOWS}
									onChange={(value) => set({ flow: value })}
								/>
							</>
						}
					/>
					<Breakdown
						period={period}
						by={by}
						flow={flow}
						compare={!all}
						linkOf={linkOf}
					/>
				</Card>
		</>
	);
}

const BUCKET_LABEL = {
	year: "ano",
	month: "mês",
	week: "semana",
} as const;

function Totals({ period, compare }: { period: Period; compare: boolean }) {
	const overview = useOverview(period);
	if (overview.error) return <ErrorNote error={overview.error} />;
	const o = overview.data;
	if (!o) return <Skeleton className="rounded-card h-[104px]" />;
	const rate = o.income > 0 ? Math.round((o.net / o.income) * 100) : null;
	const previousRate =
		o.previousTotals.income > 0
			? Math.round((o.previousTotals.net / o.previousTotals.income) * 100)
			: null;
	const tiles = [
		{
			label: "Entradas",
			value: money(o.income),
			delta: (
				<Delta now={o.income} before={o.previousTotals.income} goodWhenUp />
			),
		},
		{
			label: "Saídas",
			value: money(o.expense),
			delta: (
				<Delta
					now={o.expense}
					before={o.previousTotals.expense}
					goodWhenUp={false}
				/>
			),
		},
		{
			label: "Sobra",
			value: money(o.net),
			tone: o.net < 0 ? "text-warn" : "",
			delta: (
				<span className="num text-dim text-[11px]">
					anterior {money(o.previousTotals.net)}
				</span>
			),
		},
		{
			label: "Taxa de poupança",
			value: rate === null ? "—" : `${rate}%`,
			tone: rate !== null && rate < 0 ? "text-warn" : "",
			delta: (
				<span className="num text-dim text-[11px]">
					{previousRate === null
						? "sem entradas no anterior"
						: `anterior ${previousRate}%`}
				</span>
			),
		},
	];
	return (
		<Card className="[&>*]:border-line grid grid-cols-1 gap-y-4 py-4 sm:grid-cols-2 xl:grid-cols-4 xl:[&>*:not(:first-child)]:border-l sm:[&>*:nth-child(even)]:border-l">
			{tiles.map((t) => (
				<div key={t.label} className="flex min-w-0 flex-col gap-1.5 px-4">
					<span className="num text-dim text-[11px] tracking-[.06em] uppercase">
						{t.label}
					</span>
					<span className={`num text-[22px] whitespace-nowrap ${t.tone ?? ""}`}>
						{t.value}
					</span>
					{compare ? t.delta : null}
				</div>
			))}
		</Card>
	);
}

function Evolution({
	period,
	bucket,
}: {
	period: Period;
	bucket: keyof typeof BUCKET_LABEL;
}) {
	const trend = useCashflow(period, bucket);
	if (trend.error) return <ErrorNote error={trend.error} />;
	const data = trend.data;
	if (!data) return <Skeleton className="h-[260px]" />;
	const short = (d: string) =>
		data.bucket === "year"
			? d.slice(0, 4)
			: data.bucket === "month"
			? (MONTH_SHORT[Number(d.slice(5, 7)) - 1] ?? d)
			: `${Number(d.slice(8))} ${MONTH_SHORT[Number(d.slice(5, 7)) - 1]}`;
	return (
		<GroupedBars
			legend
			height={260}
			label="Entradas e saídas por período"
			series={[
				{ label: "Entradas", color: SERIES.income },
				{ label: "Saídas", color: SERIES.expense },
			]}
			points={data.points.map((p) => ({
				label: short(p.start),
				title:
					data.bucket === "year"
						? p.start.slice(0, 4)
						: data.bucket === "month"
						? monthLabel(p.start.slice(0, 7))
						: `${dayLabel(p.start)} – ${dayLabel(p.end)}`,
				values: [p.income, p.expense],
			}))}
		/>
	);
}

function Breakdown({
	period,
	by,
	flow,
	compare,
	linkOf,
}: {
	period: Period;
	by: BreakdownDimension;
	flow: MoneyFlow;
	compare: boolean;
	linkOf: (slice: BreakdownSlice) => RowLink | null;
}) {
	const breakdown = useBreakdown(period, by, flow, 20);
	if (breakdown.error)
		return (
			<div className="p-3.5">
				<ErrorNote error={breakdown.error} />
			</div>
		);
	const data = breakdown.data;
	if (!data)
		return (
			<div className="flex flex-col gap-2 p-3.5">
				{["a", "b", "c", "d", "e"].map((k) => (
					<Skeleton key={k} className="h-8" />
				))}
			</div>
		);
	if (data.total === 0)
		return (
			<p className="text-dim px-4 py-10 text-center text-[13px]">
				{EMPTY_TEXT[by]}
			</p>
		);
	return (
		<>
			<div className="num text-fg-2 border-line flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b px-3.5 py-2.5 text-xs">
				<span>
					total <span className="text-fg text-[15px]">{money(data.total)}</span>
				</span>
				{compare ? (
					<span className="text-dim">
						anterior {money(data.previousTotal)}
					</span>
				) : null}
				{by === "label" ? (
					<span className="text-dim">
						uma transacção com várias etiquetas conta em cada uma
					</span>
				) : null}
			</div>
			<Ranking
				data={data}
				label={`${data.flow === "income" ? "Entradas" : "Saídas"} por ${VIEWS.find((v) => v.value === by)?.label.toLowerCase()}`}
				linkOf={linkOf}
				compare={compare}
			/>
		</>
	);
}
