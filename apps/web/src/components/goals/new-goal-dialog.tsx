import { addMonths } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Checkbox } from "@wallet/ui/components/checkbox";
import { Input } from "@wallet/ui/components/input";
import { useState } from "react";
import { toast } from "sonner";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { useCreateGoal } from "@/actions/goals/use-create-goal";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { currentMonth, monthLabel, parseMoney } from "@/utils/format";

const FORM_ID = "new-goal-form";
const DEADLINE_MONTHS = 60;

export function NewGoalDialog({
	onClose,
	onCreated,
}: {
	onClose: () => void;
	onCreated: (id: string) => void;
}) {
	const create = useCreateGoal();
	const accounts = (useAccounts().data ?? []).filter((a) => !a.archived);
	const savingsFirst = [...accounts].sort(
		(a, b) => Number(b.type === "savings") - Number(a.type === "savings"),
	);
	const [name, setName] = useState("");
	const [target, setTarget] = useState("");
	const [saved, setSaved] = useState("");
	const [deadline, setDeadline] = useState("");
	const [accountId, setAccountId] = useState("");
	const [monthly, setMonthly] = useState("");
	const [addToPlan, setAddToPlan] = useState(false);

	const targetCents = parseMoney(target);
	const savedCents = saved === "" ? 0 : parseMoney(saved);
	const monthlyCents = monthly === "" ? null : parseMoney(monthly);
	const account = accountId || savingsFirst[0]?.id || "";
	const canSubmit =
		!!name.trim() &&
		targetCents !== null &&
		targetCents > 0 &&
		savedCents !== null &&
		!!account &&
		(!addToPlan || (monthlyCents !== null && monthlyCents > 0)) &&
		!create.isPending;

	const start = currentMonth();
	const deadlines = [
		{ value: "", label: "Sem prazo" },
		...Array.from({ length: DEADLINE_MONTHS }, (_, i) => {
			const m = addMonths(start, i);
			return { value: m, label: monthLabel(m) };
		}),
	];

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			title="Nova meta"
			description="o progresso conta as transferências para a meta · não é despesa"
			width={520}
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
						isLoading={create.isPending}
					>
						Criar meta
					</Button>
				</>
			}
		>
			<form
				id={FORM_ID}
				className="flex flex-col gap-3.5"
				onSubmit={async (e) => {
					e.preventDefault();
					if (!canSubmit || targetCents === null || savedCents === null) return;
					const goal = await create.mutateAsync({
						name: name.trim(),
						target: targetCents,
						startingAmount: savedCents,
						accountId: account,
						deadline: deadline || null,
						monthlyContribution: monthlyCents,
						addToPlan,
					});
					toast.success(`Meta ${goal.name} criada`);
					onCreated(goal.id);
				}}
			>
				<Field label="Nome">
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Ex.: Mudança de país"
					/>
				</Field>
				<div className="grid grid-cols-2 gap-3">
					<Field label="Valor alvo (MZN)">
						<MoneyInput
							value={target}
							onChange={(e) => setTarget(e.target.value)}
						/>
					</Field>
					<Field
						label="Já poupado (MZN)"
						hint="fica como saldo inicial da meta"
					>
						<MoneyInput
							value={saved}
							onChange={(e) => setSaved(e.target.value)}
							placeholder="0"
						/>
					</Field>
				</div>
				<div className="grid grid-cols-2 gap-3">
					<Field label="Conta onde fica o dinheiro">
						<Select
							value={account}
							onValueChange={setAccountId}
							items={savingsFirst.map((a) => ({ value: a.id, label: a.name }))}
							placeholder="Escolher conta"
						/>
					</Field>
					<Field label="Prazo">
						<Select
							value={deadline}
							onValueChange={setDeadline}
							items={deadlines}
						/>
					</Field>
				</div>
				<Field
					label="Contribuição mensal (MZN)"
					hint="opcional · usada para prever quando acaba"
				>
					<MoneyInput
						value={monthly}
						onChange={(e) => setMonthly(e.target.value)}
						placeholder="0"
					/>
				</Field>
				<label className="text-fg-2 flex cursor-pointer items-center gap-2.5 text-xs">
					<Checkbox checked={addToPlan} onCheckedChange={setAddToPlan} />
					Criar o item no plano anual e na lista de cada mês
				</label>
			</form>
		</Dialog>
	);
}
