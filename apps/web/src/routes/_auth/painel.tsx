import { createFileRoute, Link } from "@tanstack/react-router";
import {
	CARD_SIZES,
	type CardSize,
	DASHBOARD_CARD_TYPES,
	type DashboardCard,
	type DashboardCardType,
} from "@wallet/shared";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	GripVerticalIcon,
	Maximize2Icon,
	Minimize2Icon,
	PlusIcon,
	RotateCcwIcon,
	Trash2Icon,
	TriangleAlertIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { useNewTransaction } from "@/components/app-shell";
import {
	CARD_CATALOG,
	CardBody,
	cardTitle,
} from "@/components/dashboard-cards";
import {
	Button,
	Card,
	Dialog,
	EmptyState,
	Page,
	PageHeader,
	Select,
	Skeleton,
} from "@/components/kit";
import { authClient } from "@/lib/auth-client";
import {
	addMonths,
	currentMonth,
	MONTH_SHORT,
	money,
	monthLabel,
	todayInput,
} from "@/lib/format";
import {
	type Period,
	useAccounts,
	useAddCard,
	useDashboardCards,
	useMonthBudget,
	useRemoveCard,
	useReorderCards,
	useResetCards,
	useUpdateCard,
} from "@/lib/queries";

const KINDS = { mes: "mês", "30d": "30 dias", ano: "ano" } as const;
type Kind = keyof typeof KINDS;

export const Route = createFileRoute("/_auth/painel")({
	validateSearch: z.object({
		periodo: z.enum(["mes", "30d", "ano"]).optional(),
		de: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/)
			.optional(),
	}),
	component: Dashboard,
});

const DAY = 86_400_000;
const addDays = (d: string, n: number) =>
	new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const lastDayOf = (month: string) => {
	const [y, m] = month.split("-").map(Number) as [number, number];
	return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};

/** The period on screen: a calendar month, the 30 days up to a date, or a year. */
function periodOf(kind: Kind, from?: string): Period {
	if (kind === "ano") {
		const y = (from ?? todayInput()).slice(0, 4);
		return { from: `${y}-01-01`, to: `${y}-12-31` };
	}
	if (kind === "30d") {
		const start = from ?? addDays(todayInput(), -29);
		return { from: start, to: addDays(start, 29) };
	}
	const month = (from ?? currentMonth()).slice(0, 7);
	return { from: `${month}-01`, to: lastDayOf(month) };
}

function shift(kind: Kind, p: Period, dir: -1 | 1): string {
	if (kind === "ano") return `${Number(p.from.slice(0, 4)) + dir}-01-01`;
	if (kind === "30d") return addDays(p.from, 30 * dir);
	return `${addMonths(p.from.slice(0, 7), dir)}-01`;
}

function periodLabel(kind: Kind, p: Period) {
	if (kind === "ano") return p.from.slice(0, 4);
	if (kind === "mes") return monthLabel(p.from.slice(0, 7));
	const d = (x: string) =>
		`${Number(x.slice(8))} ${MONTH_SHORT[Number(x.slice(5, 7)) - 1]}`;
	return `${d(p.from)} – ${d(p.to)} ${p.to.slice(0, 4)}`;
}

function greeting() {
	const h = new Date().getHours();
	return h < 12 ? "Bom dia" : h < 19 ? "Boa tarde" : "Boa noite";
}

function Dashboard() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const kind: Kind = search.periodo ?? "mes";
	const period = periodOf(kind, search.de);
	const cards = useDashboardCards();
	const accounts = useAccounts().data ?? [];
	const budget = useMonthBudget(period.to.slice(0, 7)).data;
	const openNew = useNewTransaction();
	const reorder = useReorderCards();
	const reset = useResetCards();
	const [adding, setAdding] = useState(false);
	const [dragging, setDragging] = useState<string | null>(null);
	const list = cards.data ?? [];

	const move = (id: string, to: number) => {
		const ids = list.map((c) => c.id).filter((x) => x !== id);
		ids.splice(Math.max(0, Math.min(to, ids.length)), 0, id);
		reorder.mutate(ids);
	};

	const unset = accounts
		.filter((a) => a.initialBalance === 0 && a.balance < 0)
		.sort((a, b) => a.balance - b.balance);
	const items = budget?.items ?? [];
	const listMeta = budget?.hasList
		? `${items.length} itens na lista · ${items.filter((i) => i.status === "paid" || i.status === "over").length} pagos · ${items.filter((i) => i.status === "partial").length} parcial · ${items.filter((i) => i.status === "unpaid").length} por pagar`
		: "sem lista neste mês";

	return (
		<>
			<PageHeader crumb={["painel"]}>
				<div className="flex items-center gap-1">
					<Button
						aria-label="Período anterior"
						className="w-[30px] px-0"
						onClick={() =>
							navigate({
								search: { periodo: kind, de: shift(kind, period, -1) },
							})
						}
					>
						<ChevronLeftIcon className="size-4" />
					</Button>
					<Select
						aria-label="Tipo de período"
						className="h-8 w-auto"
						value={kind}
						onChange={(e) =>
							navigate({ search: { periodo: e.target.value as Kind } })
						}
					>
						{(Object.keys(KINDS) as Kind[]).map((k) => (
							<option key={k} value={k}>
								período: {KINDS[k]}
							</option>
						))}
					</Select>
					<span className="num min-w-[150px] px-2 text-center text-xs">
						{periodLabel(kind, period)}
					</span>
					<Button
						aria-label="Período seguinte"
						className="w-[30px] px-0"
						onClick={() =>
							navigate({
								search: { periodo: kind, de: shift(kind, period, 1) },
							})
						}
					>
						<ChevronRightIcon className="size-4" />
					</Button>
				</div>
				<Link to="/orcamento" search={{ mes: period.to.slice(0, 7) }}>
					<Button>
						Lista de {monthLabel(period.to.slice(0, 7)).split(" ")[0]}
					</Button>
				</Link>
				<Button variant="primary" onClick={() => setAdding(true)}>
					<PlusIcon className="size-3.5" strokeWidth={2.6} /> Adicionar carta
				</Button>
			</PageHeader>
			<Page>
				<Greeting
					meta={`${monthLabel(period.to.slice(0, 7)).toLowerCase()} · ${listMeta}`}
				/>

				{unset[0] ? (
					<div className="border-warn-line flex flex-wrap items-center gap-3 rounded-[10px] border bg-[#221608] px-4 py-3 text-[#F0C9A2]">
						<TriangleAlertIcon
							className="text-warn size-4"
							aria-hidden="true"
						/>
						<span className="flex-1">
							A conta{" "}
							<b className="num text-warn font-medium">{unset[0].name}</b>{" "}
							mostra {money(unset[0].balance)} MZN porque o export do Wallet não
							traz saldos iniciais.
							{unset.length > 1 ? ` (+${unset.length - 1} contas)` : ""}
						</span>
						<Link
							to="/contas"
							search={{ validar: true }}
							className="text-warn font-medium"
						>
							Definir saldos →
						</Link>
					</div>
				) : null}

				{cards.isPending ? (
					<Skeleton className="h-96" />
				) : list.length === 0 ? (
					<EmptyState
						title="O painel está vazio"
						actions={
							<>
								<Button variant="primary" onClick={() => setAdding(true)}>
									Adicionar carta
								</Button>
								<Button onClick={() => reset.mutate()}>
									Repor o painel inicial
								</Button>
							</>
						}
					>
						Escolha as cartas que quer ver: fluxo de caixa, saldo, categorias,
						contas…
					</EmptyState>
				) : (
					<div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
						{list.map((card, index) => (
							<DashboardCardFrame
								key={card.id}
								card={card}
								period={period}
								index={index}
								count={list.length}
								dragging={dragging === card.id}
								onDragStart={() => setDragging(card.id)}
								onDragEnd={() => setDragging(null)}
								onDropHere={() => {
									if (dragging && dragging !== card.id) move(dragging, index);
									setDragging(null);
								}}
								onMove={(to) => move(card.id, to)}
							/>
						))}
					</div>
				)}

				{list.length > 0 ? (
					<div className="flex flex-wrap justify-end gap-2">
						<Button variant="ghost" size="sm" onClick={() => openNew()}>
							Nova transacção
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => {
								if (
									confirm(
										"Repor o painel inicial? As cartas actuais são substituídas.",
									)
								)
									reset.mutate();
							}}
						>
							<RotateCcwIcon className="size-3" /> Repor painel inicial
						</Button>
					</div>
				) : null}
			</Page>
			<AddCardDialog
				open={adding}
				onClose={() => setAdding(false)}
				period={period}
				existing={list}
			/>
		</>
	);
}

function Greeting({ meta }: { meta: string }) {
	const name = authClient.useSession().data?.user.name;
	return (
		<div className="flex flex-col gap-1">
			<h1 className="text-[26px] font-semibold tracking-[-.01em]">
				{greeting()}
				{name ? `, ${name.split(" ")[0]}` : ""}
			</h1>
			<div className="num text-dim text-xs">{meta}</div>
		</div>
	);
}

function DashboardCardFrame({
	card,
	period,
	index,
	count,
	dragging,
	onDragStart,
	onDragEnd,
	onDropHere,
	onMove,
}: {
	card: DashboardCard;
	period: Period;
	index: number;
	count: number;
	dragging: boolean;
	onDragStart: () => void;
	onDragEnd: () => void;
	onDropHere: () => void;
	onMove: (to: number) => void;
}) {
	const update = useUpdateCard();
	const remove = useRemoveCard();
	const [over, setOver] = useState(false);
	const hasRange =
		card.type === "cash-flow-trend" || card.type === "spending-by-category";
	const nextSize: CardSize = card.size === "full" ? "half" : "full";
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: drop target for mouse drag; the ↑/↓ buttons do the same by keyboard
		<Card
			className={`flex min-w-0 flex-col overflow-hidden transition-opacity ${card.size === "full" ? "lg:col-span-2" : ""} ${dragging ? "opacity-40" : ""} ${over ? "ring-info-2/50 ring-2" : ""}`}
			onDragOver={(e) => {
				e.preventDefault();
				setOver(true);
			}}
			onDragLeave={() => setOver(false)}
			onDrop={(e) => {
				e.preventDefault();
				setOver(false);
				onDropHere();
			}}
		>
			<div className="border-line flex items-center gap-2 border-b px-4 py-3">
				{/* biome-ignore lint/a11y/noStaticElementInteractions: mouse drag handle; ↑/↓ buttons are the keyboard path */}
				<span
					draggable
					onDragStart={(e) => {
						e.dataTransfer.effectAllowed = "move";
						onDragStart();
					}}
					onDragEnd={onDragEnd}
					title="Arrastar para mudar a ordem"
					className="text-faint hover:text-fg-2 cursor-grab"
				>
					<GripVerticalIcon className="size-4" aria-hidden="true" />
				</span>
				<h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
					{cardTitle(card.type, period, card.config)}
				</h2>
				{hasRange ? (
					<button
						type="button"
						className="num border-line-strong text-fg-2 hover:bg-hover cursor-pointer rounded-md border px-2 py-0.5 text-[11px]"
						onClick={() =>
							update.mutate({
								id: card.id,
								config: {
									...card.config,
									range: card.config.range === "year" ? "period" : "year",
								},
							})
						}
						title="Alternar entre o período escolhido e o ano inteiro"
					>
						{card.config.range === "year" ? "ano" : "período"}
					</button>
				) : null}
				<IconButton
					label="Subir"
					disabled={index === 0}
					onClick={() => onMove(index - 1)}
				>
					<ArrowUpIcon className="size-3.5" />
				</IconButton>
				<IconButton
					label="Descer"
					disabled={index === count - 1}
					onClick={() => onMove(index + 1)}
				>
					<ArrowDownIcon className="size-3.5" />
				</IconButton>
				<IconButton
					label={nextSize === "full" ? "Largura inteira" : "Meia largura"}
					onClick={() => update.mutate({ id: card.id, size: nextSize })}
				>
					{nextSize === "full" ? (
						<Maximize2Icon className="size-3.5" />
					) : (
						<Minimize2Icon className="size-3.5" />
					)}
				</IconButton>
				<IconButton
					label="Remover carta"
					onClick={() => {
						remove.mutate(card.id);
						toast.success(`${CARD_CATALOG[card.type].title} removida`);
					}}
				>
					<Trash2Icon className="size-3.5" />
				</IconButton>
			</div>
			<div className="flex-1 p-4">
				<CardBody type={card.type} period={period} config={card.config} />
			</div>
		</Card>
	);
}

function IconButton({
	label,
	children,
	onClick,
	disabled,
}: {
	label: string;
	children: React.ReactNode;
	onClick: () => void;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			title={label}
			disabled={disabled}
			onClick={onClick}
			className="border-line-strong bg-hover text-fg-2 hover:text-fg flex size-7 cursor-pointer items-center justify-center rounded-md border disabled:cursor-not-allowed disabled:opacity-30"
		>
			{children}
		</button>
	);
}

function AddCardDialog({
	open,
	onClose,
	period,
	existing,
}: {
	open: boolean;
	onClose: () => void;
	period: Period;
	existing: DashboardCard[];
}) {
	const add = useAddCard();
	const sections = [
		...new Set(Object.values(CARD_CATALOG).map((c) => c.section)),
	];
	return (
		<Dialog
			open={open}
			onOpenChange={(o) => !o && onClose()}
			title="Adicionar carta"
			description="pré-visualização com os seus dados do período actual"
			width={1100}
		>
			{sections.map((section) => (
				<section key={section} className="flex flex-col gap-3">
					<h3 className="text-[17px] font-semibold">{section}</h3>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						{DASHBOARD_CARD_TYPES.filter(
							(t) => CARD_CATALOG[t].section === section,
						).map((type: DashboardCardType) => {
							const onBoard = existing.filter((c) => c.type === type).length;
							return (
								<Card
									key={type}
									className="group relative flex flex-col overflow-hidden"
								>
									<div className="border-line flex items-start justify-between gap-2 border-b px-4 py-3">
										<div className="flex flex-col gap-0.5">
											<h4 className="text-sm font-semibold">
												{CARD_CATALOG[type].title}
											</h4>
											<span className="text-dim text-xs">
												{CARD_CATALOG[type].description}
											</span>
										</div>
										{onBoard ? (
											<span className="num text-dim text-[11px]">
												já no painel ×{onBoard}
											</span>
										) : null}
									</div>
									<div
										className="pointer-events-none max-h-[230px] overflow-hidden p-4 opacity-90"
										aria-hidden="true"
									>
										<CardBody
											type={type}
											period={period}
											config={
												type === "cash-flow-trend" ? { range: "year" } : {}
											}
										/>
									</div>
									<div className="absolute inset-x-0 bottom-3 flex justify-center">
										<Button
											variant="primary"
											className="shadow-lg"
											disabled={add.isPending}
											onClick={async () => {
												await add.mutateAsync({
													type,
													size: CARD_SIZES[type === "summary" ? 1 : 0],
													config:
														type === "cash-flow-trend" ? { range: "year" } : {},
												});
												toast.success(
													`${CARD_CATALOG[type].title} adicionada ao painel`,
												);
												onClose();
											}}
										>
											<PlusIcon className="size-3.5" strokeWidth={2.6} />{" "}
											Adicionar
										</Button>
									</div>
								</Card>
							);
						})}
					</div>
				</section>
			))}
		</Dialog>
	);
}
