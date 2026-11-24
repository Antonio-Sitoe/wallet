import { getRouteApi, Link } from "@tanstack/react-router";
import { ACCOUNT_TYPES, type AccountType } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Skeleton } from "@wallet/ui/components/skeleton";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { AccountDetail } from "@/components/accounts/account-detail";
import { NewAccountDialog } from "@/components/accounts/new-account-dialog";
import { StartOverDialog } from "@/components/accounts/start-over-dialog";
import { initials } from "@/components/accounts/utils";
import { ValidateBalancesDialog } from "@/components/accounts/validate-balances-dialog";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorNote } from "@/components/ui/error-note";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { PageTitle } from "@/components/ui/page-title";
import { Pill } from "@/components/ui/pill";
import { Stat } from "@/components/ui/stat";
import { StatRow } from "@/components/ui/stat-row";
import { Swatch } from "@/components/ui/swatch";
import { ACCOUNT_TYPE_LABEL, money } from "@/utils/format";

const route = getRouteApi("/_private/accounts");

export const GROUPS: { title: string; types: AccountType[] }[] = [
	{ title: "Bancos", types: ["bank"] },
	{ title: "Poupança", types: ["savings"] },
	{ title: "Dinheiro e carteiras", types: ["cash", "mobile_wallet"] },
];

export function AccountsPage() {
	const { id, archived, validate, create } = route.useSearch();
	const navigate = route.useNavigate();
	const accounts = useAccounts(!!archived);
	const [creating, setCreating] = useState(!!create);
	const [startOver, setStartOver] = useState(false);
	const list = accounts.data ?? [];
	const selected = list.find((a) => a.id === id);
	const sum = (types: AccountType[]) =>
		list
			.filter((a) => types.includes(a.type) && !a.archived)
			.reduce((s, a) => s + a.balance, 0);

	return (
		<>
			<PageHeader crumb={["contas"]}>
				<Link
					to="/accounts"
					search={{ id, archived: !archived }}
					className="text-fg-2 hover:text-fg text-xs"
				>
					{archived ? "Esconder arquivadas" : "Mostrar arquivadas"}
				</Link>
				<Button
					variant="neutral"
					onClick={() => navigate({ search: { id, archived, validate: true } })}
				>
					Validar saldos
				</Button>
				<Button variant="neutral" onClick={() => setStartOver(true)}>
					Começar do zero
				</Button>
				<Button variant="primary" onClick={() => setCreating(true)}>
					<PlusIcon className="size-3.5" strokeWidth={2.6} /> Nova conta
				</Button>
			</PageHeader>
			{startOver ? (
				<StartOverDialog
					accounts={list.filter((a) => !a.archived)}
					onClose={() => setStartOver(false)}
				/>
			) : null}
			{validate && list.length > 0 ? (
				<ValidateBalancesDialog
					accounts={list.filter((a) => !a.archived)}
					onClose={() => navigate({ search: { id, archived } })}
				/>
			) : null}
			<Page>
				<PageTitle
					title="Contas"
					meta="saldo = saldo inicial + todas as transacções"
				/>
				{accounts.error ? <ErrorNote error={accounts.error} /> : null}
				<StatRow>
					<Stat
						label="Saldo total"
						value={money(sum([...ACCOUNT_TYPES]))}
						note={`${list.filter((a) => !a.archived).length} contas`}
					/>
					{GROUPS.map((g) => (
						<Stat
							key={g.title}
							label={g.title}
							value={money(sum(g.types))}
							tone={g.types.includes("savings") ? "ok" : undefined}
						/>
					))}
				</StatRow>

				{creating ? (
					<NewAccountDialog onClose={() => setCreating(false)} />
				) : null}

				{accounts.isPending ? (
					<Skeleton className="h-64" />
				) : list.length === 0 ? (
					<EmptyState
						title="Ainda não há contas"
						actions={
							<>
								<Button variant="primary" onClick={() => setCreating(true)}>
									Criar conta
								</Button>
								<Link to="/import">
									<Button variant="neutral">Importar do Wallet</Button>
								</Link>
							</>
						}
					>
						Crie as suas contas (banco, M-Pesa, e-Mola, numerário, poupança) ou
						importe-as do Wallet.
					</EmptyState>
				) : (
					<div className="flex flex-wrap items-start gap-[18px]">
						<Card className="min-w-0 flex-1 overflow-hidden">
							{GROUPS.map((g) => {
								const items = list.filter((a) => g.types.includes(a.type));
								if (items.length === 0) return null;
								return (
									<div key={g.title}>
										<div className="num border-line bg-panel-2 text-dim flex justify-between border-b px-3.5 py-2 text-[11px] tracking-[.06em] uppercase">
											<h2 className="text-fg-2 font-semibold">{g.title}</h2>
											<span>{money(sum(g.types))}</span>
										</div>
										{items.map((a) => (
											<button
												key={a.id}
												type="button"
												aria-pressed={a.id === selected?.id}
												onClick={() =>
													navigate({ search: { id: a.id, archived } })
												}
												className={`border-hover hover:bg-hover flex w-full cursor-pointer items-center gap-3 border-b px-3.5 py-2.5 text-left ${a.id === selected?.id ? "bg-hover shadow-[inset_0_0_0_1px_var(--color-line-strong)]" : ""}`}
											>
												<Swatch color={a.color} label={initials(a.name)} />
												<span className="flex min-w-0 flex-1 flex-col gap-0.5">
													<span className="font-medium">
														{a.name}{" "}
														{a.archived ? (
															<Pill className="ml-1">arquivada</Pill>
														) : null}
													</span>
													<span className="num text-dim text-[11px]">
														{ACCOUNT_TYPE_LABEL[a.type]} · {a.transactionCount}{" "}
														reg.
													</span>
												</span>
												<span
													className={`num ${a.balance < 0 ? "text-warn" : ""}`}
												>
													{money(a.balance)}
												</span>
											</button>
										))}
									</div>
								);
							})}
						</Card>
						{selected ? (
							<AccountDetail
								key={selected.id}
								account={selected}
								onDeleted={() => navigate({ search: { archived } })}
								onClose={() => navigate({ search: { archived } })}
							/>
						) : null}
					</div>
				)}
			</Page>
		</>
	);
}
