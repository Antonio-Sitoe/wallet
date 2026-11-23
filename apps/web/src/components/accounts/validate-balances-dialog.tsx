import type { Account } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { useState } from "react";
import { toast } from "sonner";
import { useReconcileAccount } from "@/actions/accounts/use-reconcile-account";
import { Dialog } from "@/components/ui/dialog";
import { MoneyInput } from "@/components/ui/money-input";
import { money, moneyInput, parseMoney, signedMoney } from "@/utils/format";

export function ValidateBalancesDialog({
	accounts,
	onClose,
}: {
	accounts: Account[];
	onClose: () => void;
}) {
	const reconcile = useReconcileAccount();
	const [values, setValues] = useState<Record<string, string>>({});
	const [busy, setBusy] = useState(false);
	const rows = accounts.map((a) => {
		const typed = values[a.id];
		const real =
			typed === undefined || typed.trim() === "" ? null : parseMoney(typed);
		return {
			account: a,
			typed,
			real,
			diff: real === null ? null : real - a.balance,
		};
	});
	const changes = rows.filter((r) => r.real !== null && r.diff !== 0);
	const invalid = rows.some(
		(r) => r.typed && r.typed.trim() !== "" && r.real === null,
	);

	return (
		<Dialog
			open
			onOpenChange={(o) => !o && onClose()}
			width={720}
			title="Validar saldos"
			description="escreva o saldo real de hoje (do Wallet ou do banco); deixe em branco o que já está certo"
			footer={
				<>
					<span className="num text-dim mr-auto text-xs">
						{changes.length
							? `${changes.length} contas a acertar`
							: "nada a acertar"}
					</span>
					<Button variant="neutral" onClick={onClose}>
						Fechar
					</Button>
					<Button
						variant="primary"
						disabled={changes.length === 0 || invalid || busy}
						onClick={async () => {
							setBusy(true);
							try {
								for (const r of changes)
									await reconcile.mutateAsync({
										id: r.account.id,
										balance: r.real!,
									});
								toast.success(`${changes.length} saldos acertados`);
								onClose();
							} finally {
								setBusy(false);
							}
						}}
					>
						Aplicar acertos
					</Button>
				</>
			}
		>
			<table className="w-full border-collapse">
				<thead>
					<tr>
						{["Conta", "Na app", "Saldo real hoje", "Diferença"].map((h, i) => (
							<th
								key={h}
								scope="col"
								className={`num border-line text-dim border-b pb-2 text-[11px] font-medium tracking-[.06em] uppercase ${i === 0 ? "text-left" : "text-right"}`}
							>
								{h}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((r) => (
						<tr key={r.account.id} className="border-hover border-b">
							<td className="py-2">{r.account.name}</td>
							<td
								className={`num py-2 text-right ${r.account.balance < 0 ? "text-warn" : ""}`}
							>
								{money(r.account.balance)}
							</td>
							<td className="py-2 pl-3">
								<MoneyInput
									aria-label={`Saldo real de ${r.account.name}`}
									className="h-8 text-right"
									placeholder={moneyInput(r.account.balance)}
									value={r.typed ?? ""}
									onChange={(e) =>
										setValues((v) => ({ ...v, [r.account.id]: e.target.value }))
									}
								/>
							</td>
							<td
								className={`num py-2 text-right ${r.diff ? "text-warn" : "text-dim"}`}
							>
								{r.real === null
									? "—"
									: r.diff === 0
										? "certo"
										: signedMoney(r.diff ?? 0)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
			<p className="text-dim text-xs">
				O acerto muda só o saldo inicial de cada conta. Se a diferença vem de
				transacções que faltam (ex.: o salário deste mês), prefira registá-las.
			</p>
		</Dialog>
	);
}
