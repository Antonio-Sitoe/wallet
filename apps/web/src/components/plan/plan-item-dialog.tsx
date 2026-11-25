import {
	BUDGET_GROUPS,
	type BudgetGroup,
	type Frequency,
	type PlanItemYear,
} from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Input } from "@wallet/ui/components/input";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { useCategories } from "@/actions/categories/use-categories";
import { useAddPlanItem } from "@/actions/plan/use-add-plan-item";
import { useDeletePlanItem } from "@/actions/plan/use-delete-plan-item";
import { useUpdatePlanItem } from "@/actions/plan/use-update-plan-item";
import { Check } from "@/components/plan/check";
import { categoryItems } from "@/components/ui/category-items";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { useConfirm } from "@/contexts/confirm-context";
import { searchHref } from "@/lib/search-params";
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
	const confirmAction = useConfirm();
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
									!(await confirmAction({
										title: `Tirar ${item.name} do plano a partir de ${applyFrom}? Meses pagos ficam.`,
									}))
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
					<Button variant="neutral" onClick={onClose}>
						Cancelar
					</Button>
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
					<Input
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
						onValueChange={(value) => setGroup(value as BudgetGroup)}
						items={[
							...BUDGET_GROUPS.map((g) => ({
								value: g,
								label: String(GROUP_LABEL[g]),
							})),
						]}
					/>
				</Field>
				<Field
					label="Categoria"
					hint="transacções desta categoria contam para o item"
				>
					<Select
						value={categoryId}
						onValueChange={(value) => setCategoryId(value)}
						items={[
							{ value: "", label: "Sem categoria" },
							...categoryItems(categories, "expense"),
						]}
					/>
				</Field>
				<Field label="Frequência">
					<Select
						value={frequency}
						onValueChange={(value) => {
							setFrequency(value as Frequency);
							setMonths([]);
						}}
						items={[
							...(Object.keys(FREQ_LABEL) as Frequency[]).map((f) => ({
								value: f,
								label: String(FREQ_LABEL[f]),
							})),
						]}
					/>
				</Field>
				<Field label="Conta por defeito">
					<Select
						value={accountId}
						onValueChange={(value) => setAccountId(value)}
						items={[
							{ value: "", label: "Escolher ao marcar" },
							...accounts.map((a) => ({
								value: a.id,
								label: a.name,
							})),
						]}
					/>
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
						onValueChange={(value) => setToAccountId(value)}
						items={[
							{ value: "", label: "Nenhuma (é uma despesa)" },
							...accounts
								.filter((a) => a.id !== accountId)
								.map((a) => ({ value: a.id, label: a.name })),
						]}
					/>
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
						onValueChange={(value) => setApplyFrom(value)}
						items={[
							...MONTH_SHORT.map((label, i) => {
								const m = `${year}-${String(i + 1).padStart(2, "0")}`;
								return {
									value: m,
									label: `${label} ${year} ${m === now ? " (este mês)" : ""}`,
								};
							}),
						]}
					/>
				</Field>
			) : null}
			{!item ? null : (
				<Link
					to={searchHref("budget", { month: applyFrom })}
					className="text-xs"
				>
					ver a lista de {applyFrom}
				</Link>
			)}
		</Dialog>
	);
}
