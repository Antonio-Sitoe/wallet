import { createFileRoute, Link } from "@tanstack/react-router";
import { ACCOUNT_TYPES, type Account, type AccountType } from "@wallet/shared";
import { PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { useNewTransaction } from "@/components/app-shell";
import {
	Button,
	Card,
	CardHeader,
	EmptyState,
	ErrorNote,
	Field,
	MoneyInput,
	Page,
	PageHeader,
	PageTitle,
	Pill,
	Select,
	Skeleton,
	Stat,
	StatRow,
	Swatch,
	TextInput,
} from "@/components/kit";
import {
	ACCOUNT_TYPE_LABEL,
	dayKey,
	dayLabel,
	money,
	moneyInput,
	parseMoney,
	signedMoney,
} from "@/lib/format";
import {
	useAccounts,
	useCategories,
	useCreateAccount,
	useDeleteAccount,
	useReconcileAccount,
	useTransactionPages,
	useUpdateAccount,
} from "@/lib/queries";

export const Route = createFileRoute("/_auth/contas")({
	validateSearch: z.object({
		id: z.string().optional(),
		arquivadas: z.boolean().optional(),
	}),
	component: AccountsPage,
});

const GROUPS: { title: string; types: AccountType[] }[] = [
	{ title: "Bancos", types: ["bank"] },
	{ title: "Poupança", types: ["savings"] },
	{ title: "Dinheiro e carteiras", types: ["cash", "mobile_wallet"] },
];

const COLORS = [
	"#3FB950",
	"#58A6FF",
	"#F0883E",
	"#A371F7",
	"#39C5BB",
	"#D29922",
	"#F778BA",
	"#8B949E",
];

const initials = (name: string) =>
	name
		.replace(/[^\p{L}\p{N}]/gu, "")
		.slice(0, 2)
		.toUpperCase();

function AccountsPage() {
	const { id, arquivadas } = Route.useSearch();
	const navigate = Route.useNavigate();
	const accounts = useAccounts(!!arquivadas);
	const [creating, setCreating] = useState(false);
	const list = accounts.data ?? [];
	const selected = list.find((a) => a.id === id) ?? list[0];
	const sum = (types: AccountType[]) =>
		list
			.filter((a) => types.includes(a.type) && !a.archived)
			.reduce((s, a) => s + a.balance, 0);

	return (
		<>
			<PageHeader crumb={["contas"]}>
				<Link
					to="/contas"
					search={{ id, arquivadas: !arquivadas }}
					className="text-fg-2 hover:text-fg text-xs"
				>
					{arquivadas ? "Esconder arquivadas" : "Mostrar arquivadas"}
				</Link>
				<Button variant="primary" onClick={() => setCreating(true)}>
					<PlusIcon className="size-3.5" strokeWidth={2.6} /> Nova conta
				</Button>
			</PageHeader>
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
					<NewAccountForm
						onDone={(newId) => {
							setCreating(false);
							if (newId) navigate({ search: { id: newId } });
						}}
					/>
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
								<Link to="/importar">
									<Button>Importar do Wallet</Button>
								</Link>
							</>
						}
					>
						Crie as suas contas (banco, M-Pesa, e-Mola, numerário, poupança) ou
						importe-as do Wallet.
					</EmptyState>
				) : (
					<div className="flex flex-wrap items-start gap-[18px]">
						<Card className="min-w-0 flex-[2_1_380px] overflow-hidden">
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
													navigate({ search: { id: a.id, arquivadas } })
												}
												className={`border-hover hover:bg-hover flex w-full cursor-pointer items-center gap-3 border-b px-3.5 py-2.5 text-left ${a.id === selected?.id ? "bg-hover shadow-[inset_0_0_0_1px_#2D333B]" : ""}`}
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
								onDeleted={() => navigate({ search: {} })}
							/>
						) : null}
					</div>
				)}
			</Page>
		</>
	);
}

function NewAccountForm({ onDone }: { onDone: (id?: string) => void }) {
	const create = useCreateAccount();
	const [name, setName] = useState("");
	const [type, setType] = useState<AccountType>("bank");
	const [initial, setInitial] = useState("");
	const [color, setColor] = useState(COLORS[0]!);
	const cents = initial === "" ? 0 : parseMoney(initial);

	return (
		<Card>
			<CardHeader
				title="Nova conta"
				meta="o saldo inicial pode ficar a 0 e ser acertado depois"
			/>
			<form
				className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end"
				onSubmit={async (e) => {
					e.preventDefault();
					if (!name.trim() || cents === null) return;
					const account = await create.mutateAsync({
						name: name.trim(),
						type,
						initialBalance: cents,
						color,
					});
					toast.success(`Conta ${account.name} criada`);
					onDone(account.id);
				}}
			>
				<Field label="Nome">
					<TextInput
						autoFocus
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Ex.: M-Pesa"
					/>
				</Field>
				<Field label="Tipo">
					<Select
						value={type}
						onChange={(e) => setType(e.target.value as AccountType)}
					>
						{ACCOUNT_TYPES.map((t) => (
							<option key={t} value={t}>
								{ACCOUNT_TYPE_LABEL[t]}
							</option>
						))}
					</Select>
				</Field>
				<Field label="Saldo inicial (MZN)">
					<MoneyInput
						value={initial}
						onChange={(e) => setInitial(e.target.value)}
						placeholder="0"
					/>
				</Field>
				<div className="flex gap-2">
					<Button onClick={() => onDone()}>Cancelar</Button>
					<Button
						type="submit"
						variant="primary"
						disabled={!name.trim() || cents === null || create.isPending}
					>
						Criar
					</Button>
				</div>
				<fieldset className="flex flex-wrap gap-1.5 border-0 p-0 sm:col-span-4">
					<legend className="sr-only">Cor</legend>
					{COLORS.map((c) => (
						<button
							key={c}
							type="button"
							aria-pressed={c === color}
							aria-label={c}
							onClick={() => setColor(c)}
							className="size-6 cursor-pointer rounded-md"
							style={{
								background: c,
								outline: c === color ? "2px solid #E6E8EB" : "none",
								outlineOffset: 2,
							}}
						/>
					))}
				</fieldset>
			</form>
		</Card>
	);
}

function AccountDetail({
	account,
	onDeleted,
}: {
	account: Account;
	onDeleted: () => void;
}) {
	const update = useUpdateAccount();
	const reconcile = useReconcileAccount();
	const remove = useDeleteAccount();
	const openNew = useNewTransaction();
	const categories = useCategories().data ?? [];
	const recent = useTransactionPages({ accountId: [account.id] }, 8);
	const items = recent.data?.pages[0]?.items ?? [];
	const [name, setName] = useState(account.name);
	const [type, setType] = useState(account.type);
	const [balance, setBalance] = useState(moneyInput(account.balance));
	useEffect(() => setBalance(moneyInput(account.balance)), [account.balance]);
	const balanceCents = parseMoney(balance);
	const categoryName = (id: string | null) =>
		categories.find((c) => c.id === id)?.name ?? "Sem categoria";

	return (
		<Card className="min-w-0 flex-[1_1_340px] overflow-hidden">
			<div className="border-line flex items-center gap-3 border-b px-4 py-3.5">
				<Swatch
					color={account.color}
					label={initials(account.name)}
					className="size-9"
				/>
				<div className="flex min-w-0 flex-1 flex-col">
					<h2 className="text-[17px] font-semibold">{account.name}</h2>
					<span className="num text-dim text-[11px]">
						{ACCOUNT_TYPE_LABEL[account.type]} · saldo inicial{" "}
						{money(account.initialBalance)}
					</span>
				</div>
				<span
					className={`num text-xl ${account.balance < 0 ? "text-warn" : ""}`}
				>
					{money(account.balance)}
				</span>
			</div>

			<div className="flex flex-col gap-3.5 p-4">
				<form
					className="grid grid-cols-[1fr_auto] items-end gap-2"
					onSubmit={async (e) => {
						e.preventDefault();
						if (balanceCents === null) return;
						await reconcile.mutateAsync({
							id: account.id,
							balance: balanceCents,
						});
						toast.success(
							`Saldo de ${account.name} acertado para ${money(balanceCents)} MZN`,
						);
					}}
				>
					<Field label="Saldo real hoje (MZN) · ajusta o saldo inicial para bater">
						<MoneyInput
							value={balance}
							onChange={(e) => setBalance(e.target.value)}
						/>
					</Field>
					<Button
						type="submit"
						disabled={
							balanceCents === null ||
							balanceCents === account.balance ||
							reconcile.isPending
						}
					>
						Acertar
					</Button>
				</form>

				<form
					className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
					onSubmit={async (e) => {
						e.preventDefault();
						await update.mutateAsync({
							id: account.id,
							name: name.trim(),
							type,
						});
						toast.success("Conta actualizada");
					}}
				>
					<Field label="Nome">
						<TextInput value={name} onChange={(e) => setName(e.target.value)} />
					</Field>
					<Field label="Tipo">
						<Select
							value={type}
							onChange={(e) => setType(e.target.value as AccountType)}
						>
							{ACCOUNT_TYPES.map((t) => (
								<option key={t} value={t}>
									{ACCOUNT_TYPE_LABEL[t]}
								</option>
							))}
						</Select>
					</Field>
					<Button
						type="submit"
						disabled={
							!name.trim() || (name === account.name && type === account.type)
						}
					>
						Guardar
					</Button>
				</form>

				<div className="border-line overflow-hidden rounded-lg border">
					<div className="border-line bg-panel-2 flex items-center justify-between border-b px-3 py-2">
						<h3 className="text-sm font-semibold">Movimentos recentes</h3>
						<Link
							to="/transacoes"
							search={{ conta: account.id }}
							className="text-xs"
						>
							ver todos
						</Link>
					</div>
					{items.length === 0 ? (
						<p className="text-dim px-3 py-4 text-center">Sem movimentos.</p>
					) : (
						items.map((t) => (
							<div
								key={t.id}
								className="border-hover flex items-center gap-3 border-b px-3 py-2 text-xs last:border-0"
							>
								<span className="num text-dim w-24">
									{dayLabel(dayKey(t.occurredAt))}
								</span>
								<span className="min-w-0 flex-1 truncate">
									{t.type === "transfer"
										? "Transferência"
										: categoryName(t.categoryId)}
								</span>
								<span className={`num ${t.amount > 0 ? "text-money" : ""}`}>
									{signedMoney(t.amount)}
								</span>
							</div>
						))
					)}
				</div>

				<div className="flex flex-wrap gap-2">
					<Button onClick={() => openNew({ accountId: account.id })}>
						Nova transacção nesta conta
					</Button>
					<Button
						variant="ghost"
						onClick={async () => {
							await update.mutateAsync({
								id: account.id,
								archived: !account.archived,
							});
							toast.success(
								account.archived ? "Conta reactivada" : "Conta arquivada",
							);
						}}
					>
						{account.archived ? "Reactivar" : "Arquivar"}
					</Button>
					<Button
						variant="danger"
						className="ml-auto"
						disabled={account.transactionCount > 0}
						title={
							account.transactionCount > 0
								? "Tem transacções: arquive em vez de apagar"
								: undefined
						}
						onClick={async () => {
							if (!confirm(`Apagar a conta ${account.name}?`)) return;
							await remove.mutateAsync(account.id);
							toast.success("Conta apagada");
							onDeleted();
						}}
					>
						Apagar
					</Button>
				</div>
			</div>
		</Card>
	);
}
