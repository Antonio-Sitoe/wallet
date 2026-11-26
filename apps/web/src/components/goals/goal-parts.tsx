import type { GoalDetail } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Checkbox } from "@wallet/ui/components/checkbox";
import { Input } from "@wallet/ui/components/input";
import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useAddGoalPart } from "@/actions/goals/use-add-goal-part";
import { useDeleteGoalPart } from "@/actions/goals/use-delete-goal-part";
import { useUpdateGoalPart } from "@/actions/goals/use-update-goal-part";
import { MoneyInput } from "@/components/ui/money-input";
import { Pill } from "@/components/ui/pill";
import { money, parseMoney } from "@/utils/format";

export function GoalParts({ goal }: { goal: GoalDetail }) {
	const add = useAddGoalPart();
	const update = useUpdateGoalPart();
	const remove = useDeleteGoalPart();
	const [name, setName] = useState("");
	const [amount, setAmount] = useState("");
	const cents = parseMoney(amount);
	const canAdd = !!name.trim() && cents !== null && cents > 0 && !add.isPending;
	const unpaid = goal.parts
		.filter((p) => !p.paid)
		.reduce((s, p) => s + p.amount, 0);

	return (
		<section className="flex flex-col gap-2">
			<div className="flex items-baseline justify-between">
				<h3 className="text-sm font-semibold">Partes</h3>
				{unpaid > 0 ? (
					<span className="num text-dim text-[11px]">
						por pagar {money(unpaid)}
					</span>
				) : null}
			</div>
			{goal.parts.length > 0 ? (
				<ul className="border-line divide-line flex flex-col divide-y rounded-lg border">
					{goal.parts.map((p) => (
						<li key={p.id} className="flex items-center gap-3 px-3 py-2">
							<Checkbox
								aria-label={`${p.name} pago`}
								checked={p.paid}
								onCheckedChange={(paid) => update.mutate({ id: p.id, paid })}
							/>
							<span className="min-w-0 flex-1 truncate">{p.name}</span>
							<span className="num">{money(p.amount)}</span>
							<Pill tone={p.paid ? "ok" : "warn"}>
								{p.paid ? "pago" : "por pagar"}
							</Pill>
							<Button
								variant="quiet"
								size="icon-sm"
								aria-label={`Apagar ${p.name}`}
								onClick={() => remove.mutate(p.id)}
							>
								<Trash2Icon className="size-3.5" />
							</Button>
						</li>
					))}
				</ul>
			) : (
				<p className="text-dim text-xs">
					Sem partes. Use para dividir a meta (ex.: Fossa, Pedreiro).
				</p>
			)}
			<form
				className="grid grid-cols-[1fr_120px_auto] gap-2"
				onSubmit={async (e) => {
					e.preventDefault();
					if (!canAdd || cents === null) return;
					await add.mutateAsync({
						goalId: goal.id,
						name: name.trim(),
						amount: cents,
					});
					setName("");
					setAmount("");
				}}
			>
				<Input
					aria-label="Nome da parte"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Nova parte"
				/>
				<MoneyInput
					aria-label="Valor da parte"
					value={amount}
					onChange={(e) => setAmount(e.target.value)}
					placeholder="0"
				/>
				<Button type="submit" variant="neutral"
					disabled={!canAdd}
					isLoading={add.isPending}
				>
					Adicionar
				</Button>
			</form>
		</section>
	);
}
