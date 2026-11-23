import type { Transaction } from "@wallet/shared";
import { toast } from "sonner";
import { useDeleteTransaction } from "@/actions/transactions/use-delete-transaction";
import { DetailCard } from "@/components/transactions/detail-card";
import { Button } from "@/components/ui/button";
import { dayKey, dayLabel, signedMoney } from "@/utils/format";

export function AdjustmentDetail({
	tx,
	account,
	onClose,
}: {
	tx: Transaction;
	account: string;
	onClose: () => void;
}) {
	const remove = useDeleteTransaction();
	return (
		<DetailCard title="Acerto de saldo" onClose={onClose}>
			<p className="text-fg-2 text-xs">
				Ajusta o saldo de <b>{account}</b> em{" "}
				<span className="num">{signedMoney(tx.amount)} MZN</span> a{" "}
				{dayLabel(dayKey(tx.occurredAt))}. Não conta como receita nem despesa.
			</p>
			{tx.note ? <p className="text-dim text-xs">{tx.note}</p> : null}
			<div className="flex gap-2 pt-1">
				<Button
					variant="danger"
					onClick={async () => {
						if (!confirm("Apagar este acerto? O saldo da conta volta atrás."))
							return;
						await remove.mutateAsync(tx.id);
						toast.success("Acerto apagado");
						onClose();
					}}
				>
					Apagar acerto
				</Button>
			</div>
		</DetailCard>
	);
}
