import { Skeleton } from "@wallet/ui/components/skeleton";
import { useState } from "react";
import type { Period } from "@/@types/period";
import { useBalanceTrend } from "@/actions/analytics/use-balance-trend";
import { LineChart } from "@/components/charts/line-chart";
import { SERIES } from "@/components/charts/series";
import { Segmented } from "@/components/ui/segmented";
import {
	dayLabel,
	MONTH_SHORT,
	money,
	signedMoney,
	todayInput,
} from "@/utils/format";

const RANGES = {
	"3m": { label: "3 meses", days: 91 },
	"1y": { label: "1 ano", days: 365 },
	"3y": { label: "3 anos", days: 3 * 365 },
} as const;
type Range = keyof typeof RANGES;

const DAY = 86_400_000;

function periodEndingToday(days: number): Period {
	const to = todayInput();
	const from = new Date(Date.parse(`${to}T00:00:00Z`) - (days - 1) * DAY)
		.toISOString()
		.slice(0, 10);
	return { from, to };
}

const shortDate = (d: string, withYear: boolean) =>
	`${withYear ? "" : `${Number(d.slice(8))} `}${MONTH_SHORT[Number(d.slice(5, 7)) - 1]}${withYear ? ` ${d.slice(2, 4)}` : ""}`;

export function AccountBalanceChart({ accountId }: { accountId: string }) {
	const [range, setRange] = useState<Range>("1y");
	const period = periodEndingToday(RANGES[range].days);
	const points = useBalanceTrend(period, accountId).data;
	const first = points?.[0]?.balance ?? 0;
	const last = points?.at(-1)?.balance ?? 0;
	const monthly = range !== "3m";

	return (
		<section
			aria-label="Histórico do saldo"
			className="border-line flex flex-col gap-3 rounded-lg border p-3"
		>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-3">
					<h3 className="text-sm font-semibold">Histórico do saldo</h3>
					{points ? (
						<span
							className={`num text-[11px] ${last - first < 0 ? "text-warn" : "text-money-2"}`}
						>
							{signedMoney(last - first)} em {RANGES[range].label}
						</span>
					) : null}
				</div>
				<Segmented
					value={range}
					onChange={setRange}
					options={(Object.keys(RANGES) as Range[]).map((value) => ({
						value,
						label: RANGES[value].label,
					}))}
				/>
			</div>
			{points ? (
				<LineChart
					area
					height={180}
					label={`Saldo da conta nos últimos ${RANGES[range].label}: de ${money(first)} para ${money(last)} MZN`}
					xLabels={points.map((p) => shortDate(p.date, monthly))}
					titles={points.map((p) => dayLabel(p.date))}
					series={[
						{
							label: "Saldo",
							color: last < 0 ? SERIES.expense : SERIES.current,
							values: points.map((p) => p.balance),
						},
					]}
				/>
			) : (
				<Skeleton className="h-[180px]" />
			)}
		</section>
	);
}
