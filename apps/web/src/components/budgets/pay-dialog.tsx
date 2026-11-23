import type { MonthItem } from "@wallet/shared";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { TextInput } from "@/components/ui/text-input";
import { useAccounts, usePayMonthItem } from "@/lib/queries";
import {
	instantOf,
	money,
	moneyInput,
	parseMoney,
	todayInput,
} from "@/utils/format";

export function PayDialog({
	item,
	onClose,
}: {
	item: MonthItem;
	onClose: () => void;
}) {
	const accounts = useAccounts().data ?? [];
	const pay = usePayMonthItem();
	const suggested = item.partial
		? (item.step ?? item.remaining)
		: item.remaining || item.plannedAmount;
	const [amount, setAmount] = useState(moneyInput(suggested));
	const [accountId, setAccountId] = useState(item.defaultAccountId ?? "");
	const [date, setDate] = useState(todayInput());
	const [note, setNote] = useState("");
	const cents = parseMoney(amount);
	const after = item.spent + (cents ?? 0);
	const destination = accounts.find((a) => a.id === item.toAccountId);

	async function save() {
		if (cents === null || cents <= 0 || !accountId) return;
		await pay.mutateAsync({
			id: item.id,
			amount: cents,
			accountId,
			occurredAt: instantOf(date),
			note: note || null,
		});
		toast.success(
			`${item.name} −${money(cents)} MZN${destination ? ` → ${destination.name}` : ""}`,
		);
		onClose();
	}

	return (
		<Dialog
			open
			onOpenChange={(o) => !o && onClose()}
			width={540}
			title={
				<>
					{item.partial ? "Lançar em" : "Marcar"}{" "}
					<span className="text-money">{item.name}</span>
					{item.partial ? "" : " como pago"}
				</>
			}
			description={`planeado ${money(item.plannedAmount)} · já gasto ${money(item.spent)}`}
			footer={
				<>
					<Button onClick={onClose}>Cancelar</Button>
					<Button
						variant="primary"
						disabled={
							cents === null || cents <= 0 || !accountId || pay.isPending
						}
						onClick={save}
					>
						Confirmar
					</Button>
				</>
			}
		>
			<form
				className="flex flex-col gap-3.5"
				onSubmit={(e) => {
					e.preventDefault();
					save();
				}}
			>
				<Field label="Valor pago (MZN)">
					<MoneyInput
						large
						autoFocus
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
					/>
				</Field>
				<div className="grid grid-cols-2 gap-2.5">
					<Field label={destination ? "Sai de" : "Conta"}>
						<Select
							value={accountId}
							onChange={(e) => setAccountId(e.target.value)}
						>
							<option value="">Escolher conta</option>
							{accounts
								.filter((a) => a.id !== item.toAccountId)
								.map((a) => (
									<option key={a.id} value={a.id}>
										{a.name}
										{a.id === item.defaultAccountId ? " · última usada" : ""}
									</option>
								))}
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
				</div>
				<Field label="Nota">
					<TextInput
						value={note}
						onChange={(e) => setNote(e.target.value)}
						placeholder="opcional"
					/>
				</Field>
				{cents !== null && cents > 0 ? (
					<div
						className={`rounded-md border px-3 py-2.5 text-xs leading-relaxed ${
							after > item.plannedAmount
								? "border-warn-line bg-[#221608] text-[#F0C9A2]"
								: after < item.plannedAmount
									? "border-info-line bg-info-bg text-[#B6D8FF]"
									: "border-money-line bg-money-bg text-money-2"
						}`}
					>
						{after > item.plannedAmount
							? `Acima do planeado em ${money(after - item.plannedAmount)} MZN. Conta como gasto extra do mês.`
							: after < item.plannedAmount
								? `Abaixo do planeado: faltam ${money(item.plannedAmount - after)} MZN. O item fica parcial e aceita mais lançamentos.`
								: "Fica pago."}
						{destination
							? ` É uma transferência para ${destination.name}.`
							: ""}
					</div>
				) : null}
			</form>
		</Dialog>
	);
}
