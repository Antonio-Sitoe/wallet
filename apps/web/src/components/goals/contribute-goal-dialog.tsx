import type { GoalDetail } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { useState } from "react";
import { toast } from "sonner";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { useContributeGoal } from "@/actions/goals/use-contribute-goal";
import { goalLeft } from "@/components/goals/utils";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { money, moneyInput, parseMoney } from "@/utils/format";

const FORM_ID = "contribute-goal-form";

export function ContributeGoalDialog({
	goal,
	onClose,
}: {
	goal: GoalDetail;
	onClose: () => void;
}) {
	const contribute = useContributeGoal();
	const all = useAccounts().data ?? [];
	const goalAccount = all.find((a) => a.id === goal.accountId);
	const sources = all.filter((a) => !a.archived && a.id !== goal.accountId);
	const suggested = goal.plan?.frequency === "monthly" ? goal.plan.amount : 0;
	const [amount, setAmount] = useState(
		suggested
			? moneyInput(Math.min(suggested, goalLeft(goal) || suggested))
			: "",
	);
	const [fromAccountId, setFromAccountId] = useState("");
	const from = fromAccountId || sources[0]?.id || "";
	const cents = parseMoney(amount);
	const canSubmit =
		cents !== null && cents > 0 && !!from && !contribute.isPending;

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			title={`Contribuir · ${goal.name}`}
			description={`falta ${money(goalLeft(goal))}`}
			width={460}
			footer={
				<>
					<Button variant="neutral" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						type="submit"
						form={FORM_ID}
						variant="primary"
						disabled={!canSubmit}
					>
						Transferir
					</Button>
				</>
			}
		>
			<form
				id={FORM_ID}
				className="flex flex-col gap-3.5"
				onSubmit={async (e) => {
					e.preventDefault();
					if (!canSubmit || cents === null) return;
					await contribute.mutateAsync({
						id: goal.id,
						fromAccountId: from,
						amount: cents,
					});
					toast.success(`${money(cents)} MZN para ${goal.name}`);
					onClose();
				}}
			>
				<Field label="Valor (MZN)">
					<MoneyInput
						large
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
					/>
				</Field>
				<div className="grid grid-cols-2 gap-3">
					<Field label="De">
						<Select
							value={from}
							onValueChange={setFromAccountId}
							items={sources.map((a) => ({
								value: a.id,
								label: `${a.name} · ${money(a.balance)}`,
							}))}
							placeholder="Escolher conta"
						/>
					</Field>
					<Field label="Para">
						<span className="border-line-strong bg-panel-2 text-fg-2 flex h-[34px] items-center rounded-md border px-2.5">
							{goalAccount?.name ?? "—"}
						</span>
					</Field>
				</div>
				<p className="text-dim text-xs leading-relaxed">
					Fica registado como transferência para{" "}
					{goalAccount?.name ?? "a conta da meta"}. Conta no progresso da meta
					{goal.plan
						? ` e marca o item «${goal.plan.name}» na lista do mês.`
						: " e não conta como despesa."}
				</p>
			</form>
		</Dialog>
	);
}
