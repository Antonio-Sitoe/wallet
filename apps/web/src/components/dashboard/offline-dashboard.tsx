import { useLiveQuery } from "@tanstack/react-db";
import type { Transaction } from "@wallet/shared";
import { type ReactNode, useMemo } from "react";
import type { Period } from "@/@types/period";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { AccountsCard } from "@/components/dashboard/accounts-card";
import { LastRecordsCard } from "@/components/dashboard/last-records-card";
import { Loading } from "@/components/dashboard/loading";
import { Card } from "@/components/ui/card";
import { offlineCollections } from "@/lib/offline/registry";
import { windowStart } from "@/lib/offline/transaction-window";
import { money } from "@/utils/format";

const DAY = 86_400_000;

function OfflineCard({
	title,
	full,
	children,
}: {
	title: string;
	full?: boolean;
	children: ReactNode;
}) {
	return (
		<Card
			className={`flex min-w-0 flex-col overflow-hidden ${full ? "lg:col-span-2" : ""}`}
		>
			<div className="border-line border-b px-4 py-3">
				<h2 className="text-sm font-semibold">{title}</h2>
			</div>
			<div className="px-4 py-4">{children}</div>
		</Card>
	);
}

function Figure({
	label,
	value,
	note,
}: {
	label: string;
	value: string;
	note?: string;
}) {
	return (
		<div className="flex flex-col gap-1.5 px-4">
			<span className="num text-dim text-[11px] tracking-[.06em] uppercase">
				{label}
			</span>
			<span className="num text-[22px] whitespace-nowrap xl:text-[26px]">
				{value}
			</span>
			{note ? <span className="text-dim text-xs">{note}</span> : null}
		</div>
	);
}

function OfflineSummary({ period }: { period: Period }) {
	const accounts = useAccounts().data;
	const transactions = useLiveQuery((q) =>
		q.from({ transaction: offlineCollections().transactions }),
	);
	const inside = new Date(`${period.from}T00:00:00`) >= windowStart();
	const totals = useMemo(() => {
		const start = new Date(`${period.from}T00:00:00`).getTime();
		const end = new Date(`${period.to}T00:00:00`).getTime() + DAY;
		let income = 0;
		let expense = 0;
		for (const tx of (transactions.data ?? []) as Transaction[]) {
			const at = new Date(tx.occurredAt).getTime();
			if (at < start || at >= end) continue;
			if (tx.type === "income") income += tx.amount;
			if (tx.type === "expense") expense -= tx.amount;
		}
		return { income, expense };
	}, [transactions.data, period.from, period.to]);
	if (!accounts) return <Loading />;
	const balance = accounts.reduce((sum, a) => sum + a.balance, 0);
	const outside = "fora dos últimos 12 meses guardados";
	return (
		<div className="[&>*]:border-line grid grid-cols-1 gap-y-5 sm:grid-cols-3 sm:[&>*:not(:first-child)]:border-l">
			<Figure
				label={`Saldo total · ${accounts.length} contas`}
				value={`${money(balance)} MZN`}
			/>
			<Figure
				label="Entradas"
				value={inside ? money(totals.income) : "—"}
				note={inside ? undefined : outside}
			/>
			<Figure
				label="Saídas"
				value={inside ? money(totals.expense) : "—"}
				note={inside ? undefined : outside}
			/>
		</div>
	);
}

export function OfflineDashboard({ period }: { period: Period }) {
	return (
		<div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
			<OfflineCard title="Resumo" full>
				<OfflineSummary period={period} />
			</OfflineCard>
			<OfflineCard title="Contas">
				<AccountsCard />
			</OfflineCard>
			<OfflineCard title="Últimos registos">
				<LastRecordsCard />
			</OfflineCard>
		</div>
	);
}
