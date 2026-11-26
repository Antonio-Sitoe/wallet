import type { Debt } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { useState } from "react";
import { toast } from "sonner";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { usePayDebt } from "@/actions/debts/use-pay-debt";
import { debtLeft, receiving } from "@/components/debts/utils";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { money, moneyInput, parseMoney } from "@/utils/format";

const FORM_ID = "pay-debt-form";

export function PayDebtDialog({
	debt,
	onClose,
}: {
	debt: Debt;
	onClose: () => void;
}) {
	const pay = usePayDebt();
	const accounts = (useAccounts().data ?? []).filter((a) => !a.archived);
	const left = debtLeft(debt);
	const incoming = receiving(debt);
	const [amount, setAmount] = useState(moneyInput(left));
	const [accountId, setAccountId] = useState("");
	const account = accountId || accounts[0]?.id || "";
	const cents = parseMoney(amount);
	const canSubmit =
		cents !== null && cents > 0 && cents <= left && !!account && !pay.isPending;
	const action = incoming ? "Registar recebimento" : "Registar pagamento";

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			title={`${action} · ${debt.person}`}
			description={`falta ${money(left)}`}
			width={460}
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
						isLoading={pay.isPending}
					>
						Registar
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
					await pay.mutateAsync({
						id: debt.id,
						amount: cents,
						accountId: account,
					});
					toast.success(
						incoming
							? `${money(cents)} MZN recebidos de ${debt.person}`
							: `${money(cents)} MZN pagos a ${debt.person}`,
					);
					onClose();
				}}
			>
				<Field
					label="Valor (MZN)"
					hint={
						cents !== null && cents > left
							? "maior do que o que falta"
							: undefined
					}
				>
					<MoneyInput
						large
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
					/>
				</Field>
				<div className="flex gap-2">
					<Button
						size="sm"
						variant="neutral"
						onClick={() => setAmount(moneyInput(left))}
					>
						Tudo ({money(left)})
					</Button>
					<Button
						size="sm"
						variant="neutral"
						onClick={() => setAmount(moneyInput(Math.round(left / 2)))}
					>
						Metade
					</Button>
				</div>
				<Field label={incoming ? "Entra na conta" : "Sai da conta"}>
					<Select
						value={account}
						onValueChange={setAccountId}
						items={accounts.map((a) => ({
							value: a.id,
							label: `${a.name} · ${money(a.balance)}`,
						}))}
						placeholder="Escolher conta"
					/>
				</Field>
				<p className="text-dim text-xs leading-relaxed">
					Cria uma {incoming ? "entrada" : "saída"} em Dívidas ›{" "}
					{incoming ? "Recebidas" : "Pagas"}, ligada a esta dívida. Não conta no
					orçamento do mês.
				</p>
			</form>
		</Dialog>
	);
}
