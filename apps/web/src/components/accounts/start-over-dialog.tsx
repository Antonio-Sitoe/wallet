import type { Account } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Input } from "@wallet/ui/components/input";
import { useState } from "react";
import { toast } from "sonner";
import { useResetData } from "@/actions/accounts/use-reset-data";
import { useZeroBalances } from "@/actions/accounts/use-zero-balances";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { money } from "@/utils/format";

export function StartOverDialog({
	accounts,
	onClose,
}: {
	accounts: Account[];
	onClose: () => void;
}) {
	const zero = useZeroBalances();
	const reset = useResetData();
	const [typed, setTyped] = useState("");
	const nonZero = accounts.filter((a) => a.balance !== 0);
	const total = accounts.reduce((s, a) => s + a.balance, 0);
	return (
		<Dialog
			open
			onOpenChange={(o) => !o && onClose()}
			width={560}
			title="Começar do zero"
			description="escolha se guarda o histórico importado ou se apaga tudo"
			footer={
				<Button variant="neutral" onClick={onClose}>
					Fechar
				</Button>
			}
		>
			<div className="flex flex-col gap-4">
				<section className="border-line flex flex-col gap-2 rounded-lg border p-3.5">
					<h3 className="text-sm font-semibold">Zerar saldos (recomendado)</h3>
					<p className="text-fg-2 text-xs">
						Cria um acerto em cada conta para que todas fiquem com 0 MZN a
						partir de agora. O histórico fica para as estatísticas; os acertos
						não contam como receita nem despesa.
					</p>
					<p className="num text-dim text-[11px]">
						{nonZero.length === 0
							? "todas as contas já estão a 0"
							: `${nonZero.length} contas · total ${money(total)} MZN → 0`}
					</p>
					<div>
						<Button
							variant="primary"
							disabled={nonZero.length === 0 || zero.isPending}
							onClick={async () => {
								await zero.mutateAsync({});
								toast.success("Saldos a 0. Pode começar a registar.");
								onClose();
							}}
						>
							Zerar {nonZero.length} contas
						</Button>
					</div>
				</section>
				<section className="border-danger-line bg-danger-bg/40 flex flex-col gap-2 rounded-lg border p-3.5">
					<h3 className="text-danger text-sm font-semibold">Apagar tudo</h3>
					<p className="text-fg-2 text-xs">
						Apaga todas as transacções, transferências e importações e põe os
						saldos iniciais a 0. As contas, as categorias e o plano ficam. Não
						se desfaz.
					</p>
					<Field label='Escreva "APAGAR" para confirmar'>
						<Input
							value={typed}
							onChange={(e) => setTyped(e.target.value)}
							placeholder="APAGAR"
						/>
					</Field>
					<div>
						<Button
							variant="danger"
							disabled={typed !== "APAGAR" || reset.isPending}
							onClick={async () => {
								const r = await reset.mutateAsync();
								toast.success(
									`${r.removed.transactions} transacções apagadas. Tudo a 0.`,
								);
								onClose();
							}}
						>
							Apagar tudo
						</Button>
					</div>
				</section>
			</div>
		</Dialog>
	);
}
