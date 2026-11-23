import type { Account, Category, Transaction } from "@wallet/shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDeleteTransaction } from "@/actions/transactions/use-delete-transaction";
import { useUpdateTransaction } from "@/actions/transactions/use-update-transaction";
import { DetailCard } from "@/components/transactions/detail-card";
import { monthChoices } from "@/components/transactions/utils";
import { Button } from "@/components/ui/button";
import { CategoryOptions } from "@/components/ui/category-options";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import { TextInput } from "@/components/ui/text-input";
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
	const cents = parseMoney(amount);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	return (
		<DetailCard title="Detalhe" onClose={onClose}>
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
					});
					toast.success("Transacção guardada");
				}}
			>
				<div className="grid grid-cols-2 gap-2.5">
					<Field label="Tipo">
						<Select
							value={type}
							onChange={(e) => setType(e.target.value as "expense" | "income")}
						>
							<option value="expense">Saída</option>
							<option value="income">Entrada</option>
						</Select>
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
							onChange={(e) => setAccountId(e.target.value)}
						>
							{accounts.map((a) => (
								<option key={a.id} value={a.id}>
									{a.name}
								</option>
							))}
						</Select>
					</Field>
					<Field label="Categoria">
						<Select
							value={categoryId}
							onChange={(e) => setCategoryId(e.target.value)}
						>
							<option value="">Sem categoria</option>
							<CategoryOptions categories={categories} />
						</Select>
					</Field>
					<Field label="Data">
						<TextInput
							type="date"
							className="num"
							value={date}
							onChange={(e) => setDate(e.target.value)}
						/>
					</Field>
					<Field label="Mês do orçamento">
						<Select
							value={referenceMonth}
							onChange={(e) => setReferenceMonth(e.target.value)}
						>
							{monthChoices(tx.referenceMonth).map((m) => (
								<option key={m} value={m}>
									{monthLabel(m)}
								</option>
							))}
						</Select>
					</Field>
				</div>
				<Field label="Payee">
					<TextInput
						value={payee}
						onChange={(e) => setPayee(e.target.value)}
						placeholder="sem payee"
					/>
				</Field>
				<Field label="Nota">
					<TextInput
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
							if (!confirm("Apagar esta transacção?")) return;
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
		</DetailCard>
	);
}
