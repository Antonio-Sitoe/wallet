import { Button } from "@wallet/ui/components/button";
import { Input } from "@wallet/ui/components/input";
import { useState } from "react";
import { toast } from "sonner";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { useAddMonthItem } from "@/actions/budgets/use-add-month-item";
import { useCategories } from "@/actions/categories/use-categories";
import { categoryItems } from "@/components/ui/category-items";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { monthLabel, parseMoney } from "@/utils/format";

const FORM_ID = "unplanned-item-form";

export function UnplannedItemDialog({
	month,
	onClose,
}: {
	month: string;
	onClose: () => void;
}) {
	const add = useAddMonthItem();
	const categories = useCategories().data ?? [];
	const accounts = useAccounts().data ?? [];
	const [name, setName] = useState("");
	const [amount, setAmount] = useState("");
	const [categoryId, setCategoryId] = useState("");
	const [accountId, setAccountId] = useState("");
	const cents = parseMoney(amount);
	const canSubmit =
		!!name.trim() && cents !== null && cents > 0 && !add.isPending;

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			title="Item não planeado"
			description={`presente, imprevisto… conta no total de ${monthLabel(month)}`}
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
						isLoading={add.isPending}
					>
						Adicionar
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
					await add.mutateAsync({
						month,
						name: name.trim(),
						amount: cents,
						categoryId: categoryId || null,
						accountId: accountId || null,
					});
					toast.success(`${name.trim()} adicionado a ${monthLabel(month)}`);
					onClose();
				}}
			>
				<Field label="Nome">
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Ex.: Presente Mito"
					/>
				</Field>
				<Field label="Valor (MZN)">
					<MoneyInput
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
					/>
				</Field>
				<div className="grid grid-cols-2 gap-3">
					<Field label="Categoria">
						<Select
							value={categoryId}
							onValueChange={(value) => setCategoryId(value)}
							items={[
								{ value: "", label: "Sem categoria" },
								...categoryItems(categories, "expense"),
							]}
						/>
					</Field>
					<Field label="Conta">
						<Select
							value={accountId}
							onValueChange={(value) => setAccountId(value)}
							items={[
								{ value: "", label: "Escolher depois" },
								...accounts.map((a) => ({
									value: a.id,
									label: a.name,
								})),
							]}
						/>
					</Field>
				</div>
			</form>
		</Dialog>
	);
}
