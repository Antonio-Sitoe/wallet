import type { TransactionTemplate } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { ZapIcon } from "lucide-react";
import { toast } from "sonner";
import { useTemplates } from "@/actions/settings/use-templates";
import { useCreateTransaction } from "@/actions/transactions/use-create-transaction";
import { useCreateTransfer } from "@/actions/transactions/use-create-transfer";
import { useNewTransaction } from "@/contexts/new-transaction-context";
import { useOpenSettings } from "@/contexts/settings-context";
import { money } from "@/utils/format";

const MAX_BUTTONS = 3;

const isComplete = (t: TransactionTemplate) =>
	!!t.amount &&
	!!t.accountId &&
	(t.type === "transfer" ? !!t.toAccountId : !!t.categoryId);

export function QuickTemplates() {
	const templates = useTemplates().data ?? [];
	const openNew = useNewTransaction();
	const openSettings = useOpenSettings();
	const createTx = useCreateTransaction();
	const createTransfer = useCreateTransfer();
	const pending = createTx.isPending || createTransfer.isPending;

	async function run(t: TransactionTemplate) {
		if (!isComplete(t) || !t.amount || !t.accountId)
			return openNew({
				kind: t.type,
				amount: t.amount ?? undefined,
				accountId: t.accountId ?? undefined,
				toAccountId: t.toAccountId ?? undefined,
				categoryId: t.categoryId ?? undefined,
			});
		const occurredAt = new Date().toISOString();
		if (t.type === "transfer" && t.toAccountId)
			await createTransfer.mutateAsync({
				fromAccountId: t.accountId,
				toAccountId: t.toAccountId,
				amount: t.amount,
				occurredAt,
				note: t.note,
			});
		else
			await createTx.mutateAsync({
				type: t.type === "income" ? "income" : "expense",
				accountId: t.accountId,
				categoryId: t.categoryId,
				amount: t.amount,
				occurredAt,
				payee: t.payee,
				note: t.note,
			});
		toast.success(`${t.name} · ${money(t.amount)} MZN registado`);
	}

	if (templates.length === 0)
		return (
			<Button variant="quiet" onClick={() => openSettings("templates")}>
				<ZapIcon className="size-3.5" /> Criar modelo
			</Button>
		);

	return templates.slice(0, MAX_BUTTONS).map((t) => (
		<Button
			key={t.id}
			variant="neutral"
			disabled={pending}
			onClick={() => run(t)}
			title={
				isComplete(t)
					? "Regista já, sem abrir o formulário"
					: "Abre o formulário com o modelo preenchido"
			}
		>
			<ZapIcon className="size-3.5" /> {t.name}
		</Button>
	));
}
