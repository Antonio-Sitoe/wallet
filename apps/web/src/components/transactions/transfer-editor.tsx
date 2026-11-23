import type { Account } from "@wallet/shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DetailCard } from "@/components/transactions/detail-card";
import { monthChoices } from "@/components/transactions/utils";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TextInput } from "@/components/ui/text-input";
import {
	useDeleteTransfer,
	useTransfer,
	useUpdateTransfer,
} from "@/lib/queries";
import {
	dateInputOf,
	instantOf,
	money,
	moneyInput,
	monthLabel,
	parseMoney,
	todayInput,
} from "@/utils/format";

export function TransferEditor({
	transferId,
	accounts,
	onClose,
}: {
	transferId: string;
	accounts: Account[];
	onClose: () => void;
}) {
	const transfer = useTransfer(transferId);
	const update = useUpdateTransfer();
	const remove = useDeleteTransfer();
	const [form, setForm] = useState<{
		from: string;
		to: string;
		amount: string;
		date: string;
		referenceMonth: string;
		note: string;
	} | null>(null);

	useEffect(() => {
		const t = transfer.data;
		if (t && !form)
			setForm({
				from: t.fromAccountId,
				to: t.toAccountId,
				amount: moneyInput(t.amount),
				date: dateInputOf(t.occurredAt),
				referenceMonth: t.referenceMonth,
				note: t.note ?? "",
			});
	}, [transfer.data, form]);

	if (!transfer.data || !form)
		return (
			<DetailCard title="Transferência" onClose={onClose}>
				<Skeleton className="h-40" />
			</DetailCard>
		);
	const t = transfer.data;
	const cents = parseMoney(form.amount);

	return (
		<DetailCard title="Transferência" onClose={onClose}>
			<span className="num text-[26px] font-medium">
				{money(t.amount)}
				<span className="text-dim text-[13px]"> MZN</span>
			</span>
			<form
				className="flex flex-col gap-3"
				onSubmit={async (e) => {
					e.preventDefault();
					if (cents === null || cents <= 0) return;
					await update.mutateAsync({
						id: t.id,
						fromAccountId: form.from,
						toAccountId: form.to,
						amount: cents,
						occurredAt:
							form.date === dateInputOf(t.occurredAt)
								? undefined
								: instantOf(form.date),
						referenceMonth: form.referenceMonth,
						note: form.note || null,
					});
					toast.success("Transferência guardada");
				}}
			>
				<div className="grid grid-cols-2 gap-2.5">
					<Field label="De">
						<Select
							value={form.from}
							onChange={(e) => setForm({ ...form, from: e.target.value })}
						>
							{accounts.map((a) => (
								<option key={a.id} value={a.id}>
									{a.name}
								</option>
							))}
						</Select>
					</Field>
					<Field label="Para">
						<Select
							value={form.to}
							onChange={(e) => setForm({ ...form, to: e.target.value })}
						>
							{accounts.map((a) => (
								<option key={a.id} value={a.id}>
									{a.name}
								</option>
							))}
						</Select>
					</Field>
					<Field label="Valor (MZN)">
						<MoneyInput
							value={form.amount}
							onChange={(e) => setForm({ ...form, amount: e.target.value })}
						/>
					</Field>
					<Field label="Data">
						<TextInput
							type="date"
							className="num"
							value={form.date}
							onChange={(e) => setForm({ ...form, date: e.target.value })}
							max={todayInput()}
						/>
					</Field>
					<Field label="Mês do orçamento" className="col-span-2">
						<Select
							value={form.referenceMonth}
							onChange={(e) =>
								setForm({ ...form, referenceMonth: e.target.value })
							}
						>
							{monthChoices(t.referenceMonth).map((m) => (
								<option key={m} value={m}>
									{monthLabel(m)}
								</option>
							))}
						</Select>
					</Field>
				</div>
				<Field label="Nota">
					<TextInput
						value={form.note}
						onChange={(e) => setForm({ ...form, note: e.target.value })}
						placeholder="sem nota"
					/>
				</Field>
				<div className="flex gap-2 pt-1">
					<Button
						variant="danger"
						onClick={async () => {
							if (!confirm("Apagar a transferência (as duas pernas)?")) return;
							await remove.mutateAsync(t.id);
							toast.success("Transferência apagada");
							onClose();
						}}
					>
						Apagar
					</Button>
					<Button
						type="submit"
						variant="primary"
						className="ml-auto"
						disabled={
							cents === null ||
							cents <= 0 ||
							form.from === form.to ||
							update.isPending
						}
					>
						Guardar
					</Button>
				</div>
			</form>
		</DetailCard>
	);
}
