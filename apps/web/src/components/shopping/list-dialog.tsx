import type { ShoppingListSummary } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Input } from "@wallet/ui/components/input";
import { useState } from "react";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { useMonthBudget } from "@/actions/budgets/use-month-budget";
import { useCategories } from "@/actions/categories/use-categories";
import { useCreateShoppingList } from "@/actions/shopping/use-create-shopping-list";
import { useUpdateShoppingList } from "@/actions/shopping/use-update-shopping-list";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { currentMonth, money, monthLabel } from "@/utils/format";

const FORM_ID = "shopping-list-form";

export function ListDialog({
	list,
	onClose,
	onSaved,
}: {
	list?: ShoppingListSummary;
	onClose: () => void;
	onSaved: (id: string) => void;
}) {
	const create = useCreateShoppingList();
	const update = useUpdateShoppingList();
	const month = currentMonth();
	const budget = useMonthBudget(month).data;
	const accounts = (useAccounts().data ?? []).filter((a) => !a.archived);
	const categories = (useCategories().data ?? []).filter(
		(c) => c.kind === "expense" && !c.archived && !c.isSystem,
	);
	const [name, setName] = useState(list?.name ?? "");
	const [accountId, setAccountId] = useState(list?.accountId ?? "");
	const [categoryId, setCategoryId] = useState(list?.categoryId ?? "");
	const [monthItemId, setMonthItemId] = useState(list?.monthItemId ?? "");
	const busy = create.isPending || update.isPending;
	const canSubmit = !!name.trim() && !busy;

	const monthItems = (budget?.items ?? []).filter((i) => i.group !== "savings");
	const itemOptions = [
		{ value: "", label: "Nenhum" },
		...(list?.monthItem && !monthItems.some((i) => i.id === list.monthItem?.id)
			? [
					{
						value: list.monthItem.id,
						label: `${list.monthItem.name} · ${monthLabel(list.monthItem.month)}`,
					},
				]
			: []),
		...monthItems.map((i) => ({
			value: i.id,
			label: `${i.name} · ${money(i.plannedAmount)}`,
		})),
	];
	const parentName = (id: string | null) =>
		categories.find((c) => c.id === id)?.name;

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			title={list ? "Editar lista" : "Nova lista de compras"}
			width={480}
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
						{list ? "Guardar" : "Criar lista"}
					</Button>
				</>
			}
		>
			<form
				id={FORM_ID}
				className="flex flex-col gap-3.5"
				onSubmit={async (e) => {
					e.preventDefault();
					if (!canSubmit) return;
					const body = {
						name: name.trim(),
						accountId: accountId || null,
						categoryId: categoryId || null,
						monthItemId: monthItemId || null,
					};
					const saved = list
						? await update.mutateAsync({ id: list.id, ...body })
						: await create.mutateAsync(body);
					onSaved(saved.id);
				}}
			>
				<Field label="Nome">
					<Input
						autoFocus
						placeholder="Rancho do mês"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</Field>
				<Field label="Conta que paga" hint="pré-escolhida ao marcar comprado">
					<Select
						value={accountId}
						onValueChange={setAccountId}
						items={[
							{ value: "", label: "Escolher ao marcar" },
							...accounts.map((a) => ({
								value: a.id,
								label: `${a.name} · ${money(a.balance)}`,
							})),
						]}
					/>
				</Field>
				<Field
					label={`Item do orçamento · ${monthLabel(month)}`}
					hint={
						budget && !budget.hasList
							? "este mês ainda não tem lista"
							: "cada compra conta como pagamento deste item"
					}
				>
					<Select
						value={monthItemId}
						onValueChange={setMonthItemId}
						items={itemOptions}
					/>
				</Field>
				<Field
					label="Categoria"
					hint={
						monthItemId && !categoryId
							? "usa a categoria do item do orçamento"
							: undefined
					}
				>
					<Select
						value={categoryId}
						onValueChange={setCategoryId}
						items={[
							{ value: "", label: "Sem categoria" },
							...categories.map((c) => ({
								value: c.id,
								label: c.parentId
									? `${parentName(c.parentId) ?? ""} › ${c.name}`
									: c.name,
							})),
						]}
					/>
				</Field>
			</form>
		</Dialog>
	);
}
