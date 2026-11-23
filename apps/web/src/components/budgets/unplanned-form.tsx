import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card-header";
import { CategoryOptions } from "@/components/ui/category-options";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { TextInput } from "@/components/ui/text-input";
import { useAccounts, useAddMonthItem, useCategories } from "@/lib/queries";
import { monthLabel, parseMoney } from "@/utils/format";

export function UnplannedForm({ month }: { month: string }) {
	const add = useAddMonthItem();
	const categories = useCategories().data ?? [];
	const accounts = useAccounts().data ?? [];
	const [name, setName] = useState("");
	const [amount, setAmount] = useState("");
	const [categoryId, setCategoryId] = useState("");
	const [accountId, setAccountId] = useState("");
	const cents = parseMoney(amount);
	return (
		<Card>
			<CardHeader
				title="Item não planeado"
				meta="presente, imprevisto… conta no total do mês"
			/>
			<form
				className="grid grid-cols-1 gap-2.5 p-3.5 sm:grid-cols-[2fr_1fr_1.5fr_1.5fr_auto] sm:items-end"
				onSubmit={async (e) => {
					e.preventDefault();
					if (!name.trim() || cents === null || cents <= 0) return;
					await add.mutateAsync({
						month,
						name: name.trim(),
						amount: cents,
						categoryId: categoryId || null,
						accountId: accountId || null,
					});
					setName("");
					setAmount("");
					toast.success(`${name} adicionado a ${monthLabel(month)}`);
				}}
			>
				<Field label="Nome">
					<TextInput
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
				<Field label="Categoria">
					<Select
						value={categoryId}
						onChange={(e) => setCategoryId(e.target.value)}
					>
						<option value="">Sem categoria</option>
						<CategoryOptions categories={categories} kind="expense" />
					</Select>
				</Field>
				<Field label="Conta">
					<Select
						value={accountId}
						onChange={(e) => setAccountId(e.target.value)}
					>
						<option value="">Escolher depois</option>
						{accounts.map((a) => (
							<option key={a.id} value={a.id}>
								{a.name}
							</option>
						))}
					</Select>
				</Field>
				<Button
					type="submit"
					variant="primary"
					disabled={
						!name.trim() || cents === null || cents <= 0 || add.isPending
					}
				>
					<PlusIcon className="size-3.5" strokeWidth={2.6} /> Adicionar
				</Button>
			</form>
		</Card>
	);
}
