import type { MonthItem } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Input } from "@wallet/ui/components/input";
import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useDeleteMonthItem } from "@/actions/budgets/use-delete-month-item";
import { useUpdateMonthItem } from "@/actions/budgets/use-update-month-item";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { money, moneyInput, monthLabel, parseMoney } from "@/utils/format";

export function EditMonthItemDialog({
	item,
	onClose,
}: {
	item: MonthItem;
	onClose: () => void;
}) {
	const update = useUpdateMonthItem();
	const remove = useDeleteMonthItem();
	const [planned, setPlanned] = useState(moneyInput(item.plannedAmount));
	const [name, setName] = useState(item.name);
	const cents = parseMoney(planned);
	return (
		<Dialog
			open
			onOpenChange={(o) => !o && onClose()}
			title={`Editar ${item.name}`}
			description="muda só este mês; o plano anual fica igual"
			footer={
				<>
					{item.payments.length === 0 ? (
						<Button
							variant="danger"
							className="mr-auto"
							onClick={async () => {
								await remove.mutateAsync(item.id);
								toast.success(
									`${item.name} removido de ${monthLabel(item.month)}`,
								);
								onClose();
							}}
						>
							<Trash2Icon className="size-3.5" /> Remover do mês
						</Button>
					) : null}
					<Button variant="neutral" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						variant="primary"
						disabled={cents === null || cents <= 0 || !name.trim()}
						onClick={async () => {
							if (cents === null) return;
							await update.mutateAsync({
								id: item.id,
								plannedAmount: cents,
								name: name.trim(),
							});
							onClose();
						}}
					>
						Guardar
					</Button>
				</>
			}
		>
			<Field label="Nome">
				<Input value={name} onChange={(e) => setName(e.target.value)} />
			</Field>
			<Field label="Planeado neste mês (MZN)">
				<MoneyInput
					value={planned}
					onChange={(e) => setPlanned(e.target.value)}
				/>
			</Field>
			{item.payments.length > 0 ? (
				<div className="flex flex-col gap-1">
					<span className="text-fg-2 text-xs">Pagamentos da lista</span>
					{item.payments.map((p) => (
						<span key={p.transactionId} className="num text-dim text-xs">
							{p.occurredAt.slice(0, 10)} · −{money(p.amount)}
							{p.note ? ` · ${p.note}` : ""}
						</span>
					))}
				</div>
			) : null}
		</Dialog>
	);
}
