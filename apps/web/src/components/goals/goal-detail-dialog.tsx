import type { Account } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Skeleton } from "@wallet/ui/components/skeleton";
import { toast } from "sonner";
import { useDeleteGoal } from "@/actions/goals/use-delete-goal";
import { useGoal } from "@/actions/goals/use-goal";
import { useUpdateGoal } from "@/actions/goals/use-update-goal";
import { initials } from "@/components/accounts/utils";
import { GoalContributions } from "@/components/goals/goal-contributions";
import { GoalParts } from "@/components/goals/goal-parts";
import { goalLeft, goalPace, goalPct } from "@/components/goals/utils";
import { Dialog } from "@/components/ui/dialog";
import { Pill } from "@/components/ui/pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Swatch } from "@/components/ui/swatch";
import { useConfirm } from "@/contexts/confirm-context";
import { MONTH_SHORT, money, monthLabel } from "@/utils/format";

export function GoalDetailDialog({
	id,
	color,
	accounts,
	onContribute,
	onClose,
}: {
	id: string;
	color: string;
	accounts: Account[];
	onContribute: () => void;
	onClose: () => void;
}) {
	const confirmAction = useConfirm();
	const goal = useGoal(id).data;
	const update = useUpdateGoal();
	const remove = useDeleteGoal();
	const accountName = (accountId: string) =>
		accounts.find((a) => a.id === accountId)?.name ?? "—";

	if (!goal)
		return (
			<Dialog
				open
				onOpenChange={(open) => {
					if (!open) onClose();
				}}
				title="Meta"
			>
				<Skeleton className="h-48" />
			</Dialog>
		);

	const pace = goalPace(goal);
	const left = goalLeft(goal);
	const planText = goal.plan
		? `${goal.plan.name} · ${money(goal.plan.amount)} · ${
				goal.plan.frequency === "monthly"
					? "mensal"
					: goal.plan.months.map((m) => MONTH_SHORT[m - 1]).join(", ")
			}`
		: "não está no plano";
	const facts = [
		{ k: "conta", v: accountName(goal.accountId) },
		{ k: "prazo", v: goal.deadline ? monthLabel(goal.deadline) : "sem prazo" },
		{ k: "no plano", v: planText },
	];

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			width={620}
			title={
				<span className="flex items-center gap-3">
					<Swatch
						color={color}
						label={initials(goal.name)}
						className="size-9"
					/>
					<span className="flex min-w-0 flex-col">
						<span>{goal.name}</span>
						<span className="num text-dim text-[11px] font-normal">
							{goal.description ?? `meta em ${accountName(goal.accountId)}`}
						</span>
					</span>
				</span>
			}
			footer={
				<>
					<Button
						variant="danger"
						className="mr-auto"
						onClick={async () => {
							if (
								!(await confirmAction({
									title: `Apagar a meta ${goal.name}?`,
									description:
										"As transferências ficam nas contas; só deixam de contar para esta meta.",
									confirmLabel: "Apagar meta",
								}))
							)
								return;
							await remove.mutateAsync(goal.id);
							toast.success("Meta apagada");
							onClose();
						}}
					>
						Apagar
					</Button>
					<Button
						variant="neutral"
						onClick={async () => {
							await update.mutateAsync({
								id: goal.id,
								archived: !goal.archived,
							});
							toast.success(
								goal.archived ? "Meta reactivada" : "Meta arquivada",
							);
						}}
					>
						{goal.archived ? "Reactivar" : "Arquivar"}
					</Button>
					<Button
						variant="primary"
						onClick={onContribute}
						disabled={goal.archived}
					>
						Contribuir
					</Button>
				</>
			}
		>
			<div className="flex items-center justify-between gap-3">
				<Pill tone={pace.tone}>{pace.label}</Pill>
				<span className="num text-fg-2 text-xs">{pace.forecast}</span>
			</div>
			<div className="grid grid-cols-3 gap-3">
				{[
					{ label: "poupado", value: money(goal.saved), tone: "text-money" },
					{ label: "alvo", value: money(goal.target), tone: "" },
					{ label: "falta", value: money(left), tone: "" },
				].map((s) => (
					<div key={s.label} className="flex flex-col gap-1">
						<span className="num text-dim text-[11px] tracking-[.06em] uppercase">
							{s.label}
						</span>
						<span className={`num text-lg ${s.tone}`}>{s.value}</span>
					</div>
				))}
			</div>
			<div className="flex flex-col gap-1.5">
				<ProgressBar value={goal.saved} max={goal.target} />
				<span className="num text-dim text-[11px]">
					{goalPct(goal)}% concluído
				</span>
			</div>
			<dl className="border-line divide-line grid grid-cols-1 divide-y rounded-lg border">
				{facts.map((f) => (
					<div key={f.k} className="flex justify-between gap-3 px-3 py-2">
						<dt className="text-dim text-xs">{f.k}</dt>
						<dd className="text-fg-2 text-right text-xs">{f.v}</dd>
					</div>
				))}
			</dl>
			<GoalParts goal={goal} />
			<GoalContributions goal={goal} accountName={accountName} />
		</Dialog>
	);
}
