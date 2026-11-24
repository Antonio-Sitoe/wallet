import type { PlannedOccurrence, PlannedPayment } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { XIcon } from "lucide-react";
import { toast } from "sonner";
import { useDeletePlannedPayment } from "@/actions/planned/use-delete-planned-payment";
import { useSkipPlannedPayment } from "@/actions/planned/use-skip-planned-payment";
import { useUpdatePlannedPayment } from "@/actions/planned/use-update-planned-payment";
import {
	dateLabel,
	FREQUENCY_LABEL,
	isOpen,
	REMIND_LABEL,
	statusMeta,
} from "@/components/planned/utils";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Pill } from "@/components/ui/pill";
import { useConfirm } from "@/contexts/confirm-context";
import { money } from "@/utils/format";

function Info({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="bg-panel-2 flex flex-col gap-0.5 px-3 py-2.5">
			<Label>{label}</Label>
			<span>{children}</span>
		</div>
	);
}

export function PaymentDetail({
	payment,
	occurrences,
	route,
	busy,
	onConfirm,
	onEdit,
	onClose,
}: {
	payment: PlannedPayment;
	occurrences: PlannedOccurrence[];
	route: string;
	busy: boolean;
	onConfirm: (o: PlannedOccurrence) => void;
	onEdit: () => void;
	onClose: () => void;
}) {
	const confirm = useConfirm();
	const skip = useSkipPlannedPayment();
	const update = useUpdatePlannedPayment();
	const remove = useDeletePlannedPayment();
	const next = occurrences.find(isOpen);
	const upcoming = occurrences.filter(isOpen).slice(0, 4);
	const history = occurrences.filter((o) => !isOpen(o)).reverse();
	const status = next ? statusMeta(next) : null;
	const frequency =
		payment.frequency === "once"
			? `uma vez · ${dateLabel(payment.startDate)}`
			: `${FREQUENCY_LABEL[payment.frequency]} · dia ${Number(payment.startDate.slice(8))}`;

	async function removePayment() {
		const ok = await confirm({
			title: `Apagar ${payment.name}?`,
			description: "As transacções já confirmadas ficam nas Transacções.",
			confirmLabel: "Apagar",
			destructive: true,
		});
		if (!ok) return;
		await remove.mutateAsync(payment.id);
		toast.success(`${payment.name} apagado`);
		onClose();
	}

	return (
		<section
			aria-label="Detalhe do pagamento"
			className="flex min-w-0 flex-[2_1_380px] flex-col gap-3.5"
		>
			<Card className="flex flex-col gap-4 p-[18px]">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="flex flex-col gap-1">
						<Label>
							{payment.kind === "transfer"
								? "transferência planeada"
								: "despesa planeada"}
						</Label>
						<h2 className="text-xl font-semibold">{payment.name}</h2>
					</div>
					<div className="flex items-center gap-2">
						{status ? <Pill tone={status.tone}>{status.label}</Pill> : null}
						<Button
							variant="quiet"
							size="icon-sm"
							aria-label="Fechar detalhe"
							onClick={onClose}
						>
							<XIcon className="size-4" />
						</Button>
					</div>
				</div>
				<div className="grid grid-cols-2 gap-3">
					<div className="flex flex-col gap-1">
						<Label>valor</Label>
						<span className="num text-[22px]">{money(payment.amount)}</span>
					</div>
					<div className="flex flex-col gap-1">
						<Label>vence</Label>
						<span
							className={
								next?.status === "overdue"
									? "num text-danger text-[22px]"
									: "num text-[22px]"
							}
						>
							{next ? dateLabel(next.dueDate, false) : "—"}
						</span>
					</div>
				</div>
				<div className="bg-line border-line rounded-control grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-px overflow-hidden border">
					<Info label="conta">{route}</Info>
					<Info label="frequência">{frequency}</Info>
					<Info label="item do plano">{payment.planItemName ?? "nenhum"}</Info>
					<Info label="lembrete">{REMIND_LABEL(payment.remindDays)}</Info>
					<Info label="confirmação">
						{payment.autoConfirmFrom
							? `automática desde ${dateLabel(payment.autoConfirmFrom)}`
							: "manual"}
					</Info>
				</div>
				{payment.kind === "transfer" ? (
					<p className="bg-info-bg border-info-line text-info-fg rounded-control border px-3 py-2.5 text-xs leading-relaxed">
						Transferência entre contas tuas: o dinheiro continua a contar no
						saldo total, na conta de destino.
					</p>
				) : null}
				<div className="flex flex-wrap gap-2">
					{next ? (
						<Button
							variant="primary"
							disabled={busy}
							onClick={() => onConfirm(next)}
						>
							Confirmar {money(payment.amount)} ·{" "}
							{dateLabel(next.dueDate, false)}
						</Button>
					) : null}
					{next ? (
						<Button
							variant="neutral"
							disabled={skip.isPending}
							onClick={async () => {
								await skip.mutateAsync({
									id: payment.id,
									dueDate: next.dueDate,
								});
								toast.success(`${dateLabel(next.dueDate)} saltado`);
							}}
						>
							Saltar esta vez
						</Button>
					) : null}
					<Button variant="neutral" onClick={onEdit}>
						Editar
					</Button>
					<Button
						variant="neutral"
						onClick={() =>
							update.mutate({ id: payment.id, archived: !payment.archived })
						}
					>
						{payment.archived ? "Desarquivar" : "Arquivar"}
					</Button>
					<Button variant="danger" onClick={removePayment}>
						Apagar
					</Button>
				</div>
			</Card>

			<Card className="overflow-hidden">
				<div className="border-line bg-panel-2 flex justify-between border-b px-3.5 py-2">
					<h3 className="num text-fg-2 text-[11px] font-semibold tracking-[.06em] uppercase">
						próximas datas
					</h3>
					<span className="num text-dim text-xs">
						{FREQUENCY_LABEL[payment.frequency]}
					</span>
				</div>
				{upcoming.length === 0 ? (
					<p className="text-dim px-3.5 py-4">
						Sem datas nos próximos 2 meses.
					</p>
				) : null}
				{upcoming.map((o) => (
					<div
						key={o.dueDate}
						className="border-hover flex items-center gap-3 border-b px-3.5 py-2 last:border-0"
					>
						<span className="num text-fg-2 w-24 text-xs">
							{dateLabel(o.dueDate)}
						</span>
						<span className="flex-1">
							<Pill tone={statusMeta(o).tone}>{statusMeta(o).label}</Pill>
						</span>
						<span className="num">{money(o.amount)}</span>
					</div>
				))}
			</Card>

			<Card className="overflow-hidden">
				<div className="border-line bg-panel-2 flex justify-between border-b px-3.5 py-2">
					<h3 className="num text-fg-2 text-[11px] font-semibold tracking-[.06em] uppercase">
						histórico
					</h3>
					<span className="num text-dim text-xs">últimos 90 dias</span>
				</div>
				{history.length === 0 ? (
					<p className="text-dim px-3.5 py-4">Ainda não confirmaste nenhum.</p>
				) : null}
				{history.map((o) => (
					<div
						key={o.dueDate}
						className="border-hover flex items-center gap-3 border-b px-3.5 py-2 last:border-0"
					>
						<span className="num text-dim w-24 text-xs">
							{dateLabel(o.dueDate)}
						</span>
						<span className="flex-1">
							{o.status === "paid"
								? `${o.auto ? "Pago automaticamente" : "Pago"} em ${o.paidAt ? dateLabel(o.paidAt.slice(0, 10), false) : "—"}`
								: "Saltado"}
						</span>
						<span className="num text-dim">
							{o.status === "paid"
								? `−${money(o.paidAmount ?? o.amount)}`
								: "—"}
						</span>
					</div>
				))}
			</Card>
		</section>
	);
}
