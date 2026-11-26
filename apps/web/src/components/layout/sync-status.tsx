import { Button } from "@wallet/ui/components/button";
import { useState, useSyncExternalStore } from "react";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { Dialog } from "@/components/ui/dialog";
import { useOnline } from "@/lib/connection";
import { offlineWrites } from "@/lib/offline/registry";
import type { RejectedChange } from "@/lib/offline/writes";
import { money } from "@/utils/format";

const changes = (n: number) => (n === 1 ? "1 alteração" : `${n} alterações`);

type Body = {
	type?: string;
	amount?: number;
	accountId?: string;
	fromAccountId?: string;
	toAccountId?: string;
};

function describe(change: RejectedChange, accountName: (id?: string) => string) {
	const body = (change.metadata.body ?? {}) as Body;
	const amount = body.amount === undefined ? "" : ` de ${money(body.amount)} MZN`;
	switch (change.mutationFnName) {
		case "createTransaction":
			return `${body.type === "income" ? "Entrada" : "Despesa"}${amount} · ${accountName(body.accountId)}`;
		case "updateTransaction":
			return `Alteração de transacção${amount}`;
		case "deleteTransaction":
			return "Apagar transacção";
		case "createTransfer":
			return `Transferência${amount} · ${accountName(body.fromAccountId)} → ${accountName(body.toAccountId)}`;
		case "updateTransfer":
			return `Alteração de transferência${amount}`;
		case "deleteTransfer":
			return "Apagar transferência";
		default:
			return change.mutationFnName;
	}
}

function RejectedDialog({
	open,
	onOpenChange,
	rejected,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	rejected: RejectedChange[];
}) {
	const writes = offlineWrites();
	const accounts = useAccounts(true).data ?? [];
	const accountName = (id?: string) =>
		accounts.find((a) => a.id === id)?.name ?? "conta desconhecida";
	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
			title="Alterações rejeitadas"
			description="O servidor não aceitou estas alterações. Já não aparecem nas contas: pode tentar outra vez ou descartá-las."
		>
			<ul className="flex flex-col">
				{rejected.map((change) => (
					<li
						key={change.id}
						className="border-line flex flex-wrap items-center gap-3 border-b px-[18px] py-3 last:border-0"
					>
						<div className="flex min-w-0 flex-1 flex-col gap-0.5">
							<span className="font-medium">{describe(change, accountName)}</span>
							<span className="text-warn text-xs">{change.message}</span>
							<span className="num text-dim text-[11px]">
								{new Date(change.at).toLocaleString("pt-PT")}
							</span>
						</div>
						<Button
							variant="neutral"
							size="sm"
							onClick={() => void writes.retry(change.id)}
						>
							Tentar outra vez
						</Button>
						<Button
							variant="quiet"
							size="sm"
							onClick={() => writes.discard(change.id)}
						>
							Descartar
						</Button>
					</li>
				))}
			</ul>
		</Dialog>
	);
}

export function SyncStatus() {
	const online = useOnline();
	const writes = offlineWrites();
	const { count } = useSyncExternalStore(
		writes.subscribePending,
		writes.pendingState,
	);
	const rejected = useSyncExternalStore(
		writes.subscribeRejected,
		writes.rejected,
	);
	const [open, setOpen] = useState(false);

	const label = !online
		? count
			? `sem ligação · ${changes(count)} por enviar`
			: "sem ligação"
		: count
			? `a enviar ${changes(count)}…`
			: "sincronizado";
	const dot = !online || count ? "bg-warn" : "bg-money";

	return (
		<>
			<span className="inline-flex items-center gap-1.5">
				<span className={`${dot} inline-block size-[7px] rounded-full`} />
				{label}
			</span>
			{rejected.length ? (
				<button
					type="button"
					onClick={() => setOpen(true)}
					className="text-warn cursor-pointer underline-offset-2 hover:underline"
				>
					{changes(rejected.length)} rejeitada
					{rejected.length === 1 ? "" : "s"}
				</button>
			) : null}
			<RejectedDialog
				open={open && rejected.length > 0}
				onOpenChange={setOpen}
				rejected={rejected}
			/>
		</>
	);
}
