import type { Account, Category, Transaction } from "@wallet/shared";
import { AdjustmentDetail } from "@/components/transactions/adjustment-detail";
import { TransactionEditor } from "@/components/transactions/transaction-editor";
import { TransferEditor } from "@/components/transactions/transfer-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function TransactionDetail({
	id,
	tx,
	accounts,
	categories,
	onClose,
}: {
	id: string;
	tx?: Transaction;
	accounts: Account[];
	categories: Category[];
	onClose: () => void;
}) {
	if (!tx) {
		return (
			<Card className="text-dim flex-[2_1_340px] p-4">
				A transacção {id.slice(0, 8)} não está na lista filtrada.{" "}
				<Button size="sm" onClick={onClose}>
					Fechar
				</Button>
			</Card>
		);
	}
	if (tx.type === "adjustment")
		return (
			<AdjustmentDetail
				tx={tx}
				account={accounts.find((a) => a.id === tx.accountId)?.name ?? "—"}
				onClose={onClose}
			/>
		);
	return tx.type === "transfer" && tx.transferId ? (
		<TransferEditor
			transferId={tx.transferId}
			accounts={accounts}
			onClose={onClose}
		/>
	) : (
		<TransactionEditor
			tx={tx}
			accounts={accounts}
			categories={categories}
			onClose={onClose}
		/>
	);
}
