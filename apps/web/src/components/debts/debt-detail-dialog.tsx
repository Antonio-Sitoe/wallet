import type { Account, Debt } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { useDeleteDebt } from "@/actions/debts/use-delete-debt";
import { useRemoveDebtPayment } from "@/actions/debts/use-remove-debt-payment";
import { useUpdateDebt } from "@/actions/debts/use-update-debt";
import { initials } from "@/components/accounts/utils";
import { debtLeft, debtState, receiving } from "@/components/debts/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog } from "@/components/ui/dialog";
import { Pill } from "@/components/ui/pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Swatch } from "@/components/ui/swatch";
import { useConfirm } from "@/contexts/confirm-context";
import { dayKey, dayLabel, money } from "@/utils/format";

export function DebtDetailDialog({
	debt,
	accounts,
	onPay,
	onClose,
}: {
	debt: Debt;
	accounts: Account[];
	onPay: () => void;
	onClose: () => void;
}) {
	const confirmAction = useConfirm();
	const update = useUpdateDebt();
	const remove = useDeleteDebt();
	const removePayment = useRemoveDebtPayment();
	const state = debtState(debt);
	const left = debtLeft(debt);
	const incoming = receiving(debt);
	const accountName = (id: string) =>
		accounts.find((a) => a.id === id)?.name ?? "—";

	const facts = [
		{
			k: "origem",
			v: debt.imported
				? "folha Calculo Financeiro · aba Dívidas"
				: "criada à mão",
		},
		{
			k: "categoria do pagamento",
			v: incoming ? "Dívidas › Recebidas" : "Dívidas › Pagas",
		},
	];

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			width={560}
			title={
				<span className="flex items-center gap-3">
					<Swatch
						color={left === 0 ? "#3FB950" : incoming ? "#FFA657" : "#FF7B72"}
						label={initials(debt.person)}
						className="size-9"
					/>
					<span className="flex min-w-0 flex-col">
						<span>{debt.person}</span>
						<span className="num text-dim text-[11px] font-normal">
							{incoming ? "deve-te" : "deves a"} {money(debt.amount)}
						</span>
					</span>
				</span>
			}
			footer={
				<>
					<Button
						variant="danger"
						className="mr-auto"
						onClick={async () => {
							if (
								!(await confirmAction({
									title: `Apagar a dívida de ${debt.person}?`,
									description:
										"Os pagamentos já registados ficam como transacções normais.",
									confirmLabel: "Apagar dívida",
								}))
							)
								return;
							await remove.mutateAsync(debt.id);
							toast.success("Dívida apagada");
							onClose();
						}}
					>
						Apagar
					</Button>
					<Button
						variant="neutral"
						onClick={async () => {
							await update.mutateAsync({
								id: debt.id,
								archived: !debt.archived,
							});
							toast.success(
								debt.archived ? "Dívida reactivada" : "Dívida arquivada",
							);
						}}
					>
						{debt.archived ? "Reactivar" : "Perdoar / arquivar"}
					</Button>
					<Button
						variant="primary"
						onClick={onPay}
						disabled={debt.archived || left === 0}
					>
						{incoming ? "Registar recebimento" : "Registar pagamento"}
					</Button>
				</>
			}
		>
			<Pill tone={state.tone} className="self-start">
				{state.label}
			</Pill>
			<div className="grid grid-cols-3 gap-3">
				{[
					{ label: "valor", value: money(debt.amount) },
					{ label: incoming ? "recebido" : "pago", value: money(debt.paid) },
					{ label: "falta", value: money(left) },
				].map((s) => (
					<div key={s.label} className="flex flex-col gap-1">
						<span className="num text-dim text-[11px] tracking-[.06em] uppercase">
							{s.label}
						</span>
						<span className="num text-lg">{s.value}</span>
					</div>
				))}
			</div>
			<ProgressBar value={debt.paid} max={debt.amount} />
			<dl className="border-line divide-line grid grid-cols-1 divide-y rounded-lg border">
				{facts.map((f) => (
					<div key={f.k} className="flex justify-between gap-3 px-3 py-2">
						<dt className="text-dim text-xs">{f.k}</dt>
						<dd className="text-fg-2 text-right text-xs">{f.v}</dd>
					</div>
				))}
				<div className="flex items-center justify-between gap-3 px-3 py-2">
					<dt className="text-dim text-xs">lembrete</dt>
					<dd className="flex w-56 items-center gap-1">
						<DatePicker
							aria-label="Data do lembrete"
							value={debt.remindOn ?? ""}
							onChange={(remindOn) => update.mutate({ id: debt.id, remindOn })}
						/>
						{debt.remindOn ? (
							<Button
								variant="quiet"
								size="icon-sm"
								aria-label="Tirar lembrete"
								onClick={() => update.mutate({ id: debt.id, remindOn: null })}
							>
								<Trash2Icon className="size-3.5" />
							</Button>
						) : null}
					</dd>
				</div>
			</dl>
			{debt.note ? <p className="text-fg-2 text-xs">{debt.note}</p> : null}
			<section className="flex flex-col gap-2">
				<div className="flex items-baseline justify-between">
					<h3 className="text-sm font-semibold">Histórico</h3>
					<span className="num text-dim text-[11px]">
						{debt.payments.length + 1} registos
					</span>
				</div>
				<ul className="border-line divide-line flex flex-col divide-y rounded-lg border">
					{debt.payments.map((p) => (
						<li
							key={p.transactionId}
							className="flex items-center gap-3 px-3 py-2"
						>
							<span className="num text-dim w-24 shrink-0 text-[11px]">
								{dayLabel(dayKey(p.occurredAt))}
							</span>
							<span className="min-w-0 flex-1 truncate">
								{incoming
									? `Recebido de ${debt.person}`
									: `Pago a ${debt.person}`}{" "}
								· {accountName(p.accountId)}
							</span>
							<span className={`num ${incoming ? "text-money" : ""}`}>
								{incoming ? "+" : "−"}
								{money(p.amount)}
							</span>
							<Button
								variant="quiet"
								size="icon-sm"
								aria-label="Apagar este pagamento"
								onClick={async () => {
									if (
										!(await confirmAction({
											title: "Apagar este pagamento?",
											description:
												"A transacção é apagada e o valor volta a faltar.",
											confirmLabel: "Apagar pagamento",
										}))
									)
										return;
									await removePayment.mutateAsync({
										id: debt.id,
										transactionId: p.transactionId,
									});
								}}
							>
								<Trash2Icon className="size-3.5" />
							</Button>
						</li>
					))}
					<li className="flex items-center gap-3 px-3 py-2">
						<span className="num text-dim w-24 shrink-0 text-[11px]">
							{debt.imported ? "import" : dayLabel(dayKey(debt.createdAt))}
						</span>
						<span className="text-fg-2 min-w-0 flex-1 truncate">
							{incoming
								? `${debt.person} deve-te ${money(debt.amount)} MZN`
								: `Deves a ${debt.person} ${money(debt.amount)} MZN`}
						</span>
						<span className="num text-dim">{money(debt.amount)}</span>
					</li>
				</ul>
			</section>
		</Dialog>
	);
}
