import type { Account, Category, Transaction } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Input } from "@wallet/ui/components/input";
import { useState } from "react";
import { toast } from "sonner";
import { useDeleteTransaction } from "@/actions/transactions/use-delete-transaction";
import { useUpdateTransaction } from "@/actions/transactions/use-update-transaction";
import { DetailDialog } from "@/components/transactions/detail-dialog";
import { LabelsInput } from "@/components/transactions/labels-input";
import { monthChoices } from "@/components/transactions/utils";
import { categoryItems } from "@/components/ui/category-items";
import { DatePicker } from "@/components/ui/date-picker";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import { useConfirm } from "@/contexts/confirm-context";
import {
	dateInputOf,
	instantOf,
	moneyInput,
	monthLabel,
	parseMoney,
	signedMoney,
} from "@/utils/format";

export function TransactionEditor({
	tx,
	accounts,
	categories,
	onClose,
}: {
	tx: Transaction;
	accounts: Account[];
	categories: Category[];
	onClose: () => void;
}) {
	const confirmAction = useConfirm();
	const update = useUpdateTransaction();
	const remove = useDeleteTransaction();
	const [type, setType] = useState<"expense" | "income">(
		tx.type === "income" ? "income" : "expense",
	);
	const [amount, setAmount] = useState(moneyInput(Math.abs(tx.amount)));
	const [accountId, setAccountId] = useState(tx.accountId);
	const [categoryId, setCategoryId] = useState(tx.categoryId ?? "");
	const [date, setDate] = useState(dateInputOf(tx.occurredAt));
	const [referenceMonth, setReferenceMonth] = useState(tx.referenceMonth);
	const [note, setNote] = useState(tx.note ?? "");
	const [payee, setPayee] = useState(tx.payee ?? "");
	const [labels, setLabels] = useState(tx.labels);
	const cents = parseMoney(amount);

	return (
		<DetailDialog title="Detalhe" onClose={onClose}>
			<div className="flex items-baseline justify-between">
				<span className="num text-[26px] font-medium">
					{signedMoney(tx.amount)}
					<span className="text-dim text-[13px]"> MZN</span>
				</span>
				<Pill tone={tx.amount > 0 ? "ok" : "warn"}>
					{tx.amount > 0 ? "entrada" : "saída"}
				</Pill>
			</div>
			<form
				className="flex flex-col gap-3"
				onSubmit={async (e) => {
					e.preventDefault();
					if (cents === null || cents <= 0) return;
					await update.mutateAsync({
						id: tx.id,
						type,
						amount: cents,
						accountId,
						categoryId: categoryId || null,
						occurredAt:
							date === dateInputOf(tx.occurredAt) ? undefined : instantOf(date),
						referenceMonth,
						note: note || null,
						payee: payee || null,
						labels,
					});
					toast.success("Transacção guardada");
					onClose();
				}}
			>
				<div className="grid grid-cols-2 gap-2.5">
					<Field label="Tipo">
						<Select
							value={type}
							onValueChange={(value) => setType(value as "expense" | "income")}
							items={[
								{ value: "expense", label: "Saída" },
								{ value: "income", label: "Entrada" },
							]}
						/>
					</Field>
					<Field label="Valor (MZN)">
						<MoneyInput
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
						/>
					</Field>
					<Field label="Conta">
						<Select
							value={accountId}
							onValueChange={(value) => setAccountId(value)}
							items={[
								...accounts.map((a) => ({
									value: a.id,
									label: a.name,
								})),
							]}
						/>
					</Field>
					<Field label="Categoria">
						<Select
							value={categoryId}
							onValueChange={(value) => setCategoryId(value)}
							items={[
								{ value: "", label: "Sem categoria" },
								...categoryItems(categories),
							]}
						/>
					</Field>
					<Field label="Data">
						<DatePicker value={date} onChange={setDate} />
					</Field>
					<Field label="Mês do orçamento">
						<Select
							value={referenceMonth}
							onValueChange={(value) => setReferenceMonth(value)}
							items={[
								...monthChoices(tx.referenceMonth).map((m) => ({
									value: m,
									label: String(monthLabel(m)),
								})),
							]}
						/>
					</Field>
				</div>
				<Field label="Pessoa">
					<Input
						value={payee}
						onChange={(e) => setPayee(e.target.value)}
						placeholder="quem recebeu ou pagou"
					/>
				</Field>
				<Field label="Etiquetas" hint="Enter ou vírgula para juntar">
					<LabelsInput value={labels} onChange={setLabels} />
				</Field>
				<Field label="Nota">
					<Input
						value={note}
						onChange={(e) => setNote(e.target.value)}
						placeholder="sem nota"
					/>
				</Field>
				<div className="num border-line bg-canvas text-dim flex flex-col gap-1 rounded-md border px-3 py-2.5 text-[11px]">
					<span>
						{tx.monthItemId
							? "paga um item da lista do mês"
							: "sem item da lista"}
					</span>
					<span>
						{tx.importBatchId
							? `importada · lote ${tx.importBatchId.slice(0, 8)}`
							: "registo manual"}
					</span>
				</div>
				<div className="flex gap-2 pt-1">
					<Button
						variant="danger"
						onClick={async () => {
							if (!(await confirmAction({ title: "Apagar esta transacção?" })))
								return;
							await remove.mutateAsync(tx.id);
							toast.success("Transacção apagada");
							onClose();
						}}
					>
						Apagar
					</Button>
					<Button
						type="submit"
						variant="primary"
						className="ml-auto"
						disabled={cents === null || cents <= 0 || update.isPending}
					>
						Guardar
					</Button>
				</div>
			</form>
		</DetailDialog>
	);
}
