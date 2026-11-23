import { getRouteApi, Link } from "@tanstack/react-router";
import { Button } from "@wallet/ui/components/button";
import { Skeleton } from "@wallet/ui/components/skeleton";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { useGoal } from "@/actions/goals/use-goal";
import { useGoals } from "@/actions/goals/use-goals";
import { ContributeGoalDialog } from "@/components/goals/contribute-goal-dialog";
import { GoalCard } from "@/components/goals/goal-card";
import { GoalDetailDialog } from "@/components/goals/goal-detail-dialog";
import { NewGoalDialog } from "@/components/goals/new-goal-dialog";
import { goalColor, goalLeft, monthlyPlanned } from "@/components/goals/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorNote } from "@/components/ui/error-note";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { PageTitle } from "@/components/ui/page-title";
import { Stat } from "@/components/ui/stat";
import { StatRow } from "@/components/ui/stat-row";
import { money } from "@/utils/format";

const route = getRouteApi("/_private/goals");

export function GoalsPage() {
	const { id, archived } = route.useSearch();
	const navigate = route.useNavigate();
	const goals = useGoals(!!archived);
	const accounts = useAccounts(true).data ?? [];
	const [creating, setCreating] = useState(false);
	const [contributing, setContributing] = useState(false);
	const selected = useGoal(contributing ? (id ?? null) : null).data;

	const list = goals.data ?? [];
	const active = list.filter((g) => !g.archived);
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
		navigate({ search: { id: goalId, archived } });

	return (
		<>
			<PageHeader crumb={["metas"]}>
				<Link
					to="/goals"
					search={{ id, archived: !archived }}
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
							closest ? `${money(goalLeft(closest))} para concluir` : undefined
						}
						tone={closest ? undefined : "dim"}
					/>
				</StatRow>

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
				) : (
					<div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
						{list.map((g) => (
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
