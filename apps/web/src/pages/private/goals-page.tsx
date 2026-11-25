import { Button } from "@wallet/ui/components/button";
import { Skeleton } from "@wallet/ui/components/skeleton";
import { PlusIcon, TrophyIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { useGoal } from "@/actions/goals/use-goal";
import { useGoals } from "@/actions/goals/use-goals";
import { CompletedGoalCard } from "@/components/goals/completed-goal-card";
import { ContributeGoalDialog } from "@/components/goals/contribute-goal-dialog";
import { GoalCard } from "@/components/goals/goal-card";
import { GoalDetailDialog } from "@/components/goals/goal-detail-dialog";
import { type GoalTab, GoalTabs } from "@/components/goals/goal-tabs";
import { NewGoalDialog } from "@/components/goals/new-goal-dialog";
import { goalColor, goalLeft, monthlyPlanned } from "@/components/goals/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorNote } from "@/components/ui/error-note";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { PageTitle } from "@/components/ui/page-title";
import { Stat } from "@/components/ui/stat";
import { StatRow } from "@/components/ui/stat-row";
import {
	searchHref,
	usePageNavigate,
	usePageSearch,
} from "@/lib/search-params";
import { money } from "@/utils/format";

export function GoalsPage() {
	const { id, archived, tab = "active" } = usePageSearch("goals");
	const navigate = usePageNavigate("goals");
	const goals = useGoals(!!archived);
	const accounts = useAccounts(true).data ?? [];
	const [creating, setCreating] = useState(false);
	const [contributing, setContributing] = useState(false);
	const selected = useGoal(contributing ? (id ?? null) : null).data;

	const list = goals.data ?? [];
	const isDone = (g: (typeof list)[number]) => goalLeft(g) === 0;
	const ongoing = list.filter((g) => !isDone(g));
	const done = list.filter(isDone);
	const active = ongoing.filter((g) => !g.archived);
	const achieved = done.reduce((s, g) => s + g.saved, 0);
	const biggest = [...done].sort((a, b) => b.target - a.target)[0];
	const saved = active.reduce((s, g) => s + g.saved, 0);
	const left = active.reduce((s, g) => s + goalLeft(g), 0);
	const perMonth = active.reduce((s, g) => s + monthlyPlanned(g), 0);
	const closest = active
		.filter((g) => goalLeft(g) > 0)
		.sort((a, b) => goalLeft(a) - goalLeft(b))[0];
	const colorOf = (goalId: string) => {
		const index = list.findIndex((g) => g.id === goalId);
		return index >= 0 ? goalColor(list[index]!, index) : "#3FB950";
	};
	const accountName = (accountId: string) =>
		accounts.find((a) => a.id === accountId)?.name ?? "—";
	const open = (goalId?: string) =>
		navigate({ search: { id: goalId, archived, tab } });
	const switchTab = (next: GoalTab) =>
		navigate({
			search: { archived, tab: next === "active" ? undefined : next },
		});

	return (
		<>
			<PageHeader crumb={["metas"]}>
				<Link
					to={searchHref("goals", { id, archived: !archived, tab })}
					className="text-fg-2 hover:text-fg text-xs"
				>
					{archived ? "Esconder arquivadas" : "Mostrar arquivadas"}
				</Link>
				<Button variant="primary" onClick={() => setCreating(true)}>
					<PlusIcon className="size-3.5" strokeWidth={2.6} /> Nova meta
				</Button>
			</PageHeader>
			<Page>
				<PageTitle
					title="Metas"
					meta="progresso = transferências para a meta · não conta como despesa"
				/>
				{goals.error ? <ErrorNote error={goals.error} /> : null}
				{list.length > 0 ? (
					<GoalTabs
						value={tab}
						counts={{ active: ongoing.length, done: done.length }}
						onChange={switchTab}
					/>
				) : null}
				{tab === "active" ? (
					<StatRow>
						<Stat
							label="Poupado em metas"
							value={money(saved)}
							note={`${active.length} ${active.length === 1 ? "meta activa" : "metas activas"}`}
							tone="ok"
						/>
						<Stat
							label="Falta"
							value={money(left)}
							note="soma dos alvos − poupado"
						/>
						<Stat
							label="No plano por mês"
							value={money(perMonth)}
							note={
								perMonth
									? "itens mensais das metas"
									: "nenhuma meta mensal no plano"
							}
							tone={perMonth ? undefined : "dim"}
						/>
						<Stat
							label="Mais perto"
							value={closest?.name ?? "—"}
							note={
								closest
									? `${money(goalLeft(closest))} para concluir`
									: undefined
							}
							tone={closest ? undefined : "dim"}
						/>
					</StatRow>
				) : (
					<StatRow>
						<Stat
							label="Conquistado"
							value={money(achieved)}
							note="poupado nas metas concluídas"
							tone="ok"
						/>
						<Stat
							label="Metas concluídas"
							value={String(done.length)}
							note={`de ${list.length} ${list.length === 1 ? "meta" : "metas"} no total`}
						/>
						<Stat
							label="Maior conquista"
							value={biggest?.name ?? "—"}
							note={biggest ? money(biggest.target) : undefined}
							tone={biggest ? undefined : "dim"}
						/>
						<Stat
							label="Ainda em curso"
							value={String(active.length)}
							note={active.length ? "ver metas activas" : "nada pendente"}
							tone={active.length ? undefined : "dim"}
						/>
					</StatRow>
				)}

				{goals.isPending ? (
					<Skeleton className="h-48" />
				) : list.length === 0 ? (
					<EmptyState
						title="Ainda não há metas"
						actions={
							<Button variant="primary" onClick={() => setCreating(true)}>
								<PlusIcon className="size-3.5" strokeWidth={2.6} /> Nova meta
							</Button>
						}
					>
						Crie metas como a obra, o fundo de emergência ou uma mudança de
						país. Cada contribuição é uma transferência para a conta da meta.
					</EmptyState>
				) : tab === "active" ? (
					<div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
						{ongoing.map((g) => (
							<GoalCard
								key={g.id}
								goal={g}
								color={colorOf(g.id)}
								accountName={accountName(g.accountId)}
								selected={g.id === id}
								onSelect={() => open(g.id)}
							/>
						))}
						<button
							type="button"
							onClick={() => setCreating(true)}
							className="border-line-strong text-dim hover:text-fg-2 hover:border-fg-2 flex min-h-[132px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed p-4 text-center text-xs"
						>
							<PlusIcon className="size-4" />
							Nova meta (ex.: mudança de país, formação)
						</button>
					</div>
				) : done.length === 0 ? (
					<div className="border-line-strong bg-panel flex flex-col items-center gap-3 rounded-[10px] border border-dashed px-6 py-12 text-center">
						<span className="bg-money-bg text-money flex size-11 items-center justify-center rounded-full">
							<TrophyIcon className="size-5" />
						</span>
						<span className="text-fg text-[15px] font-semibold">
							Nenhuma meta concluída ainda
						</span>
						<span className="text-fg-2 max-w-[380px] text-[13px] leading-relaxed">
							Quando o poupado chegar ao alvo, a meta passa para aqui
							automaticamente.
						</span>
					</div>
				) : (
					<div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
						{done.map((g) => (
							<CompletedGoalCard
								key={g.id}
								goal={g}
								color={colorOf(g.id)}
								accountName={accountName(g.accountId)}
								selected={g.id === id}
								onSelect={() => open(g.id)}
							/>
						))}
					</div>
				)}
			</Page>

			{creating ? (
				<NewGoalDialog
					onClose={() => setCreating(false)}
					onCreated={(goalId) => {
						setCreating(false);
						open(goalId);
					}}
				/>
			) : null}
			{id && !contributing ? (
				<GoalDetailDialog
					id={id}
					color={colorOf(id)}
					accounts={accounts}
					onContribute={() => setContributing(true)}
					onClose={() => open(undefined)}
				/>
			) : null}
			{contributing && selected ? (
				<ContributeGoalDialog
					goal={selected}
					onClose={() => setContributing(false)}
				/>
			) : null}
		</>
	);
}
