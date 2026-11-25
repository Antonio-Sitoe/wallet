import type { DebtDirection } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Skeleton } from "@wallet/ui/components/skeleton";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { useDebtSuggestions } from "@/actions/debts/use-debt-suggestions";
import { useDebts } from "@/actions/debts/use-debts";
import { DebtDetailDialog } from "@/components/debts/debt-detail-dialog";
import { DebtRow } from "@/components/debts/debt-row";
import { DebtSuggestions } from "@/components/debts/debt-suggestions";
import {
	type NewDebtDefaults,
	NewDebtDialog,
} from "@/components/debts/new-debt-dialog";
import { PayDebtDialog } from "@/components/debts/pay-debt-dialog";
import { DIRECTION_LABEL, debtLeft } from "@/components/debts/utils";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorNote } from "@/components/ui/error-note";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { PageTitle } from "@/components/ui/page-title";
import { Segmented } from "@/components/ui/segmented";
import { Stat } from "@/components/ui/stat";
import { StatRow } from "@/components/ui/stat-row";
import {
	searchHref,
	usePageNavigate,
	usePageSearch,
} from "@/lib/search-params";
import { money } from "@/utils/format";

type DebtTab = DebtDirection | "history";

const people = (n: number) => `${n} ${n === 1 ? "pessoa" : "pessoas"}`;

export function DebtsPage() {
	const { id, tab = "owed_to_me", archived } = usePageSearch("debts");
	const navigate = usePageNavigate("debts");
	const debts = useDebts(!!archived);
	const suggestions = useDebtSuggestions().data ?? [];
	const accounts = useAccounts(true).data ?? [];
	const [creating, setCreating] = useState<NewDebtDefaults | null>(null);
	const [paying, setPaying] = useState(false);

	const list = debts.data ?? [];
	const active = list.filter((d) => !d.archived);
	const sumLeft = (direction: DebtDirection) =>
		active
			.filter((d) => d.direction === direction)
			.reduce((s, d) => s + debtLeft(d), 0);
	const open = (direction: DebtDirection) =>
		active.filter((d) => d.direction === direction && debtLeft(d) > 0).length;
	const receivable = sumLeft("owed_to_me");
	const payable = sumLeft("i_owe");
	const direction: DebtDirection = tab === "history" ? "owed_to_me" : tab;
	const shown = list.filter((d) => d.direction === tab);
	const selected = list.find((d) => d.id === id);
	const go = (search: { id?: string; tab?: DebtTab }) =>
		navigate({ search: { tab, archived, ...search } });

	return (
		<>
			<PageHeader crumb={["dívidas"]}>
				<Link
					to={searchHref("debts", { tab, archived: !archived })}
					className="text-fg-2 hover:text-fg text-xs"
				>
					{archived ? "Esconder arquivadas" : "Mostrar arquivadas"}
				</Link>
				<Button variant="primary" onClick={() => setCreating({ direction })}>
					<PlusIcon className="size-3.5" strokeWidth={2.6} /> Nova dívida
				</Button>
			</PageHeader>
			<Page>
				<PageTitle
					title="Dívidas"
					meta="a receber e a pagar, por pessoa · cada pagamento é uma transacção"
				/>
				{debts.error ? <ErrorNote error={debts.error} /> : null}
				<StatRow>
					<Stat
						label="A receber"
						value={money(receivable)}
						note={people(open("owed_to_me"))}
						tone={receivable ? "warn" : "dim"}
					/>
					<Stat
						label="A pagar"
						value={money(payable)}
						note={people(open("i_owe"))}
						tone={payable ? "warn" : "dim"}
					/>
					<Stat
						label="Saldo líquido"
						value={`${receivable - payable >= 0 ? "+" : "−"}${money(Math.abs(receivable - payable))}`}
						note="a receber − a pagar"
					/>
					<Stat
						label="Histórico"
						value={people(suggestions.length)}
						note="com empréstimos nas notas do Wallet"
						tone={suggestions.length ? undefined : "dim"}
					/>
				</StatRow>

				<Segmented
					className="w-[26rem] max-w-full"
					value={tab}
					onChange={(next) => go({ tab: next, id: undefined })}
					options={[
						...(["owed_to_me", "i_owe"] as const).map((d) => ({
							value: d as DebtTab,
							label: `${DIRECTION_LABEL[d]} · ${list.filter((x) => x.direction === d).length}`,
						})),
						{ value: "history", label: `Histórico · ${suggestions.length}` },
					]}
				/>

				{tab === "history" ? (
					suggestions.length === 0 ? (
						<EmptyState title="Nada no histórico">
							Quando uma nota do Wallet tiver «pessoa → eu» ou «eu → pessoa», a
							pessoa aparece aqui para converter em dívida.
						</EmptyState>
					) : (
						<DebtSuggestions
							suggestions={suggestions}
							onConvert={(s) =>
								setCreating({
									person: s.person,
									direction: s.direction,
									amount: s.net,
									note: `A partir de ${s.outCount + s.inCount} notas do Wallet`,
								})
							}
						/>
					)
				) : debts.isPending ? (
					<Skeleton className="h-48" />
				) : shown.length === 0 ? (
					<EmptyState
						title={
							tab === "owed_to_me" ? "Ninguém te deve" : "Não deves a ninguém"
						}
						actions={
							<Button
								variant="primary"
								onClick={() => setCreating({ direction })}
							>
								<PlusIcon className="size-3.5" strokeWidth={2.6} /> Nova dívida
							</Button>
						}
					>
						Registe empréstimos por pessoa, importe-os da aba Dívidas da folha
						ou converta as pessoas do separador Histórico.
					</EmptyState>
				) : (
					<Card className="overflow-hidden">
						{shown.map((d) => (
							<DebtRow
								key={d.id}
								debt={d}
								selected={d.id === id}
								onSelect={() => go({ id: d.id })}
							/>
						))}
					</Card>
				)}
			</Page>

			{creating ? (
				<NewDebtDialog
					defaults={creating}
					onClose={() => setCreating(null)}
					onCreated={(debtId) => {
						const next = creating.direction ?? direction;
						setCreating(null);
						go({ id: debtId, tab: next });
					}}
				/>
			) : null}
			{selected && !paying ? (
				<DebtDetailDialog
					debt={selected}
					accounts={accounts}
					onPay={() => setPaying(true)}
					onClose={() => go({ id: undefined })}
				/>
			) : null}
			{selected && paying ? (
				<PayDebtDialog debt={selected} onClose={() => setPaying(false)} />
			) : null}
		</>
	);
}
