import { Link } from "@tanstack/react-router";
import {
	BUDGET_GROUPS,
	type BudgetGroup,
	type Frequency,
	type PlanItemYear,
} from "@wallet/shared";
import { useState } from "react";
import { toast } from "sonner";
import { Check } from "@/components/plan/check";
import { Button } from "@/components/ui/button";
import { CategoryOptions } from "@/components/ui/category-options";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { TextInput } from "@/components/ui/text-input";
import {
	useAccounts,
	useAddPlanItem,
	useCategories,
	useDeletePlanItem,
	useUpdatePlanItem,
} from "@/lib/queries";
import {
	currentMonth,
	GROUP_LABEL,
	MONTH_SHORT,
	moneyInput,
	parseMoney,
} from "@/utils/format";

export const FREQ_LABEL: Record<Frequency, string> = {
	monthly: "Mensal",
	months: "Meses escolhidos",
	once: "Uma vez",
};

export function PlanItemDialog({
	year,
	item,
	onClose,
}: {
	year: number;
	item: PlanItemYear | null;
	onClose: () => void;
}) {
	const accounts = useAccounts().data ?? [];
	const categories = useCategories().data ?? [];
	const add = useAddPlanItem();
	const update = useUpdatePlanItem();
	const remove = useDeletePlanItem();
	const now = currentMonth();
	const defaultApply = now.startsWith(String(year)) ? now : `${year}-01`;
	const [name, setName] = useState(item?.name ?? "");
	const [group, setGroup] = useState<BudgetGroup>(item?.group ?? "fixed");
	const [categoryId, setCategoryId] = useState(item?.categoryId ?? "");
	const [amount, setAmount] = useState(item ? moneyInput(item.amount) : "");
	const [frequency, setFrequency] = useState<Frequency>(
		item?.frequency ?? "monthly",
	);
	const [months, setMonths] = useState<number[]>(
		item && item.frequency !== "monthly" ? item.months : [],
	);
	const [accountId, setAccountId] = useState(item?.accountId ?? "");
	const [toAccountId, setToAccountId] = useState(item?.toAccountId ?? "");
	const [partial, setPartial] = useState(item?.partial ?? false);
	const [step, setStep] = useState(item?.step ? moneyInput(item.step) : "");
	const [applyFrom, setApplyFrom] = useState(defaultApply);

	const cents = parseMoney(amount);
	const stepCents = step === "" ? null : parseMoney(step);
	const monthsOk =
		frequency === "monthly" ||
		(frequency === "once" ? months.length === 1 : months.length > 0);
	const valid =
		!!name.trim() &&
		cents !== null &&
		cents > 0 &&
		monthsOk &&
		(!toAccountId || toAccountId !== accountId);

	async function save() {
		if (!valid || cents === null) return;
		const body = {
			name: name.trim(),
			group,
			categoryId: categoryId || null,
			amount: cents,
			frequency,
			months: frequency === "monthly" ? [] : months,
			accountId: accountId || null,
			toAccountId: toAccountId || null,
			partial,
			step: partial ? stepCents : null,
		};
		if (item) await update.mutateAsync({ id: item.id, ...body, applyFrom });
		else await add.mutateAsync({ year, ...body });
		toast.success(
			item
				? `${body.name} actualizado a partir de ${applyFrom}`
				: `${body.name} adicionado ao plano`,
		);
		onClose();
	}

	const toggleMonth = (m: number) =>
		setMonths((current) =>
			frequency === "once"
				? [m]
				: current.includes(m)
					? current.filter((x) => x !== m)
					: [...current, m].sort((a, b) => a - b),
		);

	return (
		<Dialog
			open
			onOpenChange={(o) => !o && onClose()}
			width={620}
			title={item ? `Editar ${item.name}` : `Novo item do plano ${year}`}
			description={
				item
					? "os meses anteriores a «aplicar a partir de» e os já pagos ficam como estão"
					: "entra nas listas a partir deste mês, se já foram geradas"
			}
			footer={
				<>
					{item ? (
						<Button
							variant="danger"
							className="mr-auto"
							onClick={async () => {
								if (
									!confirm(
										`Tirar ${item.name} do plano a partir de ${applyFrom}? Meses pagos ficam.`,
									)
								)
									return;
								await remove.mutateAsync({ id: item.id, applyFrom });
								toast.success(`${item.name} retirado do plano`);
								onClose();
							}}
						>
							Apagar
						</Button>
					) : null}
					<Button onClick={onClose}>Cancelar</Button>
					<Button
						variant="primary"
						disabled={!valid || add.isPending || update.isPending}
						onClick={save}
					>
						Guardar
					</Button>
				</>
			}
		>
			<div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
				<Field label="Nome">
					<TextInput
						autoFocus
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Ex.: Escola de Sarita"
					/>
				</Field>
				<Field label="Valor por mês (MZN)">
					<MoneyInput
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
					/>
				</Field>
				<Field label="Grupo">
					<Select
						value={group}
						onChange={(e) => setGroup(e.target.value as BudgetGroup)}
					>
						{BUDGET_GROUPS.map((g) => (
							<option key={g} value={g}>
								{GROUP_LABEL[g]}
							</option>
						))}
					</Select>
				</Field>
				<Field
					label="Categoria"
					hint="transacções desta categoria contam para o item"
				>
					<Select
						value={categoryId}
						onChange={(e) => setCategoryId(e.target.value)}
					>
						<option value="">Sem categoria</option>
						<CategoryOptions categories={categories} kind="expense" />
					</Select>
				</Field>
				<Field label="Frequência">
					<Select
						value={frequency}
						onChange={(e) => {
							setFrequency(e.target.value as Frequency);
							setMonths([]);
						}}
					>
						{(Object.keys(FREQ_LABEL) as Frequency[]).map((f) => (
							<option key={f} value={f}>
								{FREQ_LABEL[f]}
							</option>
						))}
					</Select>
				</Field>
				<Field label="Conta por defeito">
					<Select
						value={accountId}
						onChange={(e) => setAccountId(e.target.value)}
					>
						<option value="">Escolher ao marcar</option>
						{accounts.map((a) => (
							<option key={a.id} value={a.id}>
								{a.name}
							</option>
						))}
					</Select>
				</Field>
			</div>
			{frequency !== "monthly" ? (
				<fieldset className="flex flex-wrap gap-1 border-0 p-0">
					<legend className="sr-only">Meses</legend>
					{MONTH_SHORT.map((label, i) => {
						const on = months.includes(i + 1);
						return (
							<button
								key={label}
								type="button"
								aria-pressed={on}
								onClick={() => toggleMonth(i + 1)}
								className={`num h-7 w-11 cursor-pointer rounded-md border text-xs ${on ? "border-money-line bg-money-bg text-money-2" : "border-line-strong bg-canvas text-fg-2"}`}
							>
								{label}
							</button>
						);
					})}
				</fieldset>
			) : null}
			<div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
				<Field
					label="Conta destino (poupança)"
					hint="se escolher, pagar o item é uma transferência"
				>
					<Select
						value={toAccountId}
						onChange={(e) => setToAccountId(e.target.value)}
					>
						<option value="">Nenhuma (é uma despesa)</option>
						{accounts
							.filter((a) => a.id !== accountId)
							.map((a) => (
								<option key={a.id} value={a.id}>
									{a.name}
								</option>
							))}
					</Select>
				</Field>
				<div className="flex flex-col gap-2">
					<Check checked={partial} onChange={setPartial}>
						Gasta-se aos poucos (vários lançamentos)
					</Check>
					{partial ? (
						<Field label="Lançamento rápido (MZN)">
							<MoneyInput
								value={step}
								onChange={(e) => setStep(e.target.value)}
								placeholder="100"
							/>
						</Field>
					) : null}
				</div>
			</div>
			{item ? (
				<Field label="Aplicar a partir de">
					<Select
						value={applyFrom}
						onChange={(e) => setApplyFrom(e.target.value)}
					>
						{MONTH_SHORT.map((label, i) => {
							const m = `${year}-${String(i + 1).padStart(2, "0")}`;
							return (
								<option key={m} value={m}>
									{label} {year}
									{m === now ? " (este mês)" : ""}
								</option>
							);
						})}
					</Select>
				</Field>
			) : null}
			{!item ? null : (
				<Link to="/budget" search={{ month: applyFrom }} className="text-xs">
					ver a lista de {applyFrom}
				</Link>
			)}
		</Dialog>
	);
}
