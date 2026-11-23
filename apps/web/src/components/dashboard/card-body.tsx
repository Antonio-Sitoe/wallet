import type { DashboardCardType } from "@wallet/shared";
import { AccountsCard } from "@/components/dashboard/accounts-card";
import { BalanceTrendCard } from "@/components/dashboard/balance-trend-card";
import { CashFlowCard } from "@/components/dashboard/cash-flow-card";
import { CashFlowTrendCard } from "@/components/dashboard/cash-flow-trend-card";
import { CategoriesCard } from "@/components/dashboard/categories-card";
import { ComparisonCard } from "@/components/dashboard/comparison-card";
import { LastRecordsCard } from "@/components/dashboard/last-records-card";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { UpcomingCard } from "@/components/dashboard/upcoming-card";
import type { Period } from "@/lib/queries";

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

export const yearOf = (p: Period): Period => ({
	from: `${p.to.slice(0, 4)}-01-01`,
	to: `${p.to.slice(0, 4)}-12-31`,
});
