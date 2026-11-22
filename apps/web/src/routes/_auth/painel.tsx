import { createFileRoute, Link } from "@tanstack/react-router";

import { useNewTransaction } from "@/components/app-shell";
import {
	Button,
	Card,
	CardHeader,
	EmptyState,
	Page,
	PageHeader,
	PageTitle,
	Skeleton,
	Stat,
	StatRow,
	StatusPill,
	Swatch,
} from "@/components/kit";
import {
	ACCOUNT_TYPE_LABEL,
	currentMonth,
	dayKey,
	dayLabel,
	money,
	monthLabel,
	signedMoney,
} from "@/lib/format";
import {
	useAccounts,
	useCategories,
	useMonthBudget,
	useTransactionPages,
} from "@/lib/queries";

export const Route = createFileRoute("/_auth/painel")({ component: Dashboard });

function Dashboard() {
	const month = currentMonth();
	const accounts = useAccounts();
	const budget = useMonthBudget(month);
	const categories = useCategories().data ?? [];
	const recent = useTransactionPages({}, 8);
	const openNew = useNewTransaction();
	const list = accounts.data ?? [];
	const total = list.reduce((s, a) => s + a.balance, 0);
	const b = budget.data;
	const pending = (b?.items ?? []).filter(
		(i) => i.status === "unpaid" || i.status === "partial",
	);
	const recentItems = recent.data?.pages[0]?.items ?? [];
	const categoryName = (id: string | null) =>
		categories.find((c) => c.id === id)?.name ?? "Sem categoria";
	const accountName = (id: string | null) =>
		list.find((a) => a.id === id)?.name ?? "—";

	return (
		<>
			<PageHeader crumb={["painel"]}>
				<Button variant="primary" onClick={() => openNew()}>
					Nova transacção
				</Button>
			</PageHeader>
			<Page>
				<PageTitle title={monthLabel(month)} meta="resumo do mês e saldos" />
				{accounts.isPending ? (
					<Skeleton className="h-24" />
				) : list.length === 0 ? (
					<EmptyState
						title="Bem-vindo ao Wallet"
						actions={
							<>
								<Link to="/importar">
									<Button variant="primary">Importar do Wallet</Button>
								</Link>
								<Link to="/contas">
									<Button>Criar contas</Button>
								</Link>
							</>
						}
					>
						Importe o histórico do Wallet (CSV) ou comece do zero criando as
						suas contas.
					</EmptyState>
				) : (
					<>
						<StatRow>
							<Stat
								label="Saldo total"
								value={money(total)}
								note={`${list.length} contas`}
							/>
							<Stat
								label="Gasto do mês"
								value={
									b ? money(b.totals.spent + b.totals.unassignedSpent) : "—"
								}
								note={
									b?.hasList
										? `de ${money(b.totals.planned)} planeado`
										: "sem lista este mês"
								}
							/>
							<Stat
								label="Falta gastar"
								value={b?.hasList ? money(b.totals.remaining) : "—"}
								tone={b?.hasList ? undefined : "dim"}
							/>
							<Stat
								label="Recebido"
								value={b ? money(b.income) : "—"}
								tone="ok"
								note={
									b?.expectedIncome
										? `previsto ${money(b.expectedIncome)}`
										: undefined
								}
							/>
						</StatRow>

						<div className="flex flex-wrap items-start gap-[18px]">
							<Card className="min-w-0 flex-[1_1_320px] overflow-hidden">
								<CardHeader
									title="Contas"
									actions={
										<Link to="/contas" className="text-xs">
											gerir
										</Link>
									}
								/>
								{list.map((a) => (
									<Link
										key={a.id}
										to="/contas"
										search={{ id: a.id }}
										className="border-hover text-fg hover:bg-hover flex items-center gap-3 border-b px-3.5 py-2.5 no-underline last:border-0"
									>
										<Swatch
											color={a.color}
											label={a.name.slice(0, 2).toUpperCase()}
										/>
										<span className="flex min-w-0 flex-1 flex-col">
											<span className="font-medium">{a.name}</span>
											<span className="num text-dim text-[11px]">
												{ACCOUNT_TYPE_LABEL[a.type]}
											</span>
										</span>
										<span className={`num ${a.balance < 0 ? "text-warn" : ""}`}>
											{money(a.balance)}
										</span>
									</Link>
								))}
							</Card>

							<Card className="min-w-0 flex-[1_1_320px] overflow-hidden">
								<CardHeader
									title="Por pagar este mês"
									meta={b?.hasList ? `${pending.length} itens` : undefined}
									actions={
										<Link to="/orcamento" className="text-xs">
											abrir lista
										</Link>
									}
								/>
								{!b ? (
									<Skeleton className="m-3 h-24" />
								) : !b.hasList ? (
									<p className="text-dim px-4 py-6 text-center">
										Sem lista para {monthLabel(month)}.{" "}
										<Link to="/plano">Criar o plano</Link>
									</p>
								) : pending.length === 0 ? (
									<p className="text-money px-4 py-6 text-center">
										Tudo pago este mês.
									</p>
								) : (
									pending.slice(0, 8).map((i) => (
										<div
											key={i.id}
											className="border-hover flex items-center gap-3 border-b px-3.5 py-2 text-xs last:border-0"
										>
											<span className="min-w-0 flex-1 truncate">{i.name}</span>
											<span className="num text-dim">
												falta {money(i.remaining)}
											</span>
											<StatusPill status={i.status} />
										</div>
									))
								)}
							</Card>

							<Card className="min-w-0 flex-[1_1_320px] overflow-hidden">
								<CardHeader
									title="Últimas transacções"
									actions={
										<Link to="/transacoes" className="text-xs">
											ver todas
										</Link>
									}
								/>
								{recentItems.map((t) => (
									<Link
										key={t.id}
										to="/transacoes"
										search={{ id: t.id }}
										className="border-hover text-fg hover:bg-hover flex items-center gap-3 border-b px-3.5 py-2 text-xs no-underline last:border-0"
									>
										<span className="num text-dim w-20">
											{dayLabel(dayKey(t.occurredAt))}
										</span>
										<span className="min-w-0 flex-1 truncate">
											{t.type === "transfer"
												? "Transferência"
												: categoryName(t.categoryId)}
											<span className="text-dim">
												{" "}
												· {accountName(t.accountId)}
											</span>
										</span>
										<span
											className={`num ${t.amount > 0 && t.type !== "transfer" ? "text-money" : ""}`}
										>
											{signedMoney(t.amount)}
										</span>
									</Link>
								))}
							</Card>
						</div>
					</>
				)}
			</Page>
		</>
	);
}
