import type { MonthItem } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogTitle,
} from "@wallet/ui/components/dialog";
import { Input } from "@wallet/ui/components/input";
import { cn } from "@wallet/ui/lib/utils";
import { XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { useMonthBudget } from "@/actions/budgets/use-month-budget";
import { useCategories } from "@/actions/categories/use-categories";
import { useCreateTransaction } from "@/actions/transactions/use-create-transaction";
import { useCreateTransfer } from "@/actions/transactions/use-create-transfer";
import { AccountPick } from "@/components/transactions/account-pick";
import { CategoryPicker } from "@/components/transactions/category-picker";
import { DatePicker } from "@/components/ui/date-picker";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import {
	addMonths,
	currentMonth,
	dayLabel,
	instantOf,
	MONTH_SHORT,
	money,
	monthLabel,
	todayInput,
	yearMonthOf,
} from "@/utils/format";

export type Kind = "expense" | "income" | "transfer";

export type NewTransactionDefaults = {
	kind?: Kind;
	accountId?: string;
	toAccountId?: string;
	categoryId?: string;
	amount?: number;
	monthItemId?: string;
	referenceMonth?: string;
};

export const KINDS: Record<
	Kind,
	{ label: string; accent: string; sign: string }
> = {
	expense: { label: "Despesa", accent: "var(--color-warn)", sign: "−" },
	income: { label: "Entrada", accent: "var(--color-money)", sign: "+" },
	transfer: {
		label: "Transferência",
		accent: "var(--color-info-2)",
		sign: "⇄",
	},
};

export const PALETTE = [
	"#E3B341",
	"#58A6FF",
	"#A371F7",
	"#39C5BB",
	"#79C0FF",
	"#F778BA",
	"#D2A8FF",
	"var(--color-caution)",
	"#56D364",
	"#FF7B72",
	"#DB61A2",
	"#FFA198",
];

export const LAST_ACCOUNT_KEY = "wallet.last-account";

export const readLast = () => {
	try {
		return localStorage.getItem(LAST_ACCOUNT_KEY) ?? "";
	} catch {
		return "";
	}
};

export const writeLast = (id: string) => {
	try {
		localStorage.setItem(LAST_ACCOUNT_KEY, id);
	} catch {}
};

export const OPS = /[+\-×÷]/;

export function evaluate(expr: string): number {
	const tokens = expr.match(/(\d+\.?\d*|\.\d+|[+\-×÷])/g) ?? [];
	if (tokens.length && OPS.test(tokens[tokens.length - 1]!)) tokens.pop();
	if (!tokens.length) return 0;
	const nums: number[] = [];
	const ops: string[] = [];
	for (const t of tokens) {
		if (OPS.test(t)) ops.push(t);
		else nums.push(Number.parseFloat(t));
	}
	const terms = [nums[0] ?? 0];
	const addOps: string[] = [];
	ops.forEach((op, i) => {
		const b = nums[i + 1];
		if (b === undefined) return;
		const last = terms.length - 1;
		if (op === "×") terms[last]! *= b;
		else if (op === "÷") terms[last] = b === 0 ? 0 : terms[last]! / b;
		else {
			addOps.push(op);
			terms.push(b);
		}
	});
	const total = addOps.reduce(
		(acc, op, i) => (op === "+" ? acc + terms[i + 1]! : acc - terms[i + 1]!),
		terms[0]!,
	);
	return Number.isFinite(total) ? total : 0;
}

export function press(expr: string, key: string): string {
	if (key === "⌫") return expr.slice(0, -1);
	if (key === "=") {
		if (!OPS.test(expr)) return expr;
		const v = Math.round(evaluate(expr) * 100) / 100;
		return v > 0 ? String(v) : "";
	}
	if (OPS.test(key)) {
		if (!expr) return expr;
		return OPS.test(expr.slice(-1)) ? expr.slice(0, -1) + key : expr + key;
	}
	const last = expr.split(OPS).pop() ?? "";
	if (key === ".") {
		if (last.includes(".")) return expr;
		return expr + (last ? "." : "0.");
	}
	if (/\.\d\d$/.test(last)) return expr;
	if (last === "0") return expr.slice(0, -1) + key;
	return expr + key;
}

export const centsToExpr = (cents: number) => String(cents / 100);

export const KEYS = [
	"7",
	"8",
	"9",
	"÷",
	"4",
	"5",
	"6",
	"×",
	"1",
	"2",
	"3",
	"−",
	".",
	"0",
	"⌫",
	"+",
];

export const KEY_LABEL: Record<string, string> = {
	"÷": "dividir",
	"×": "multiplicar",
	"−": "subtrair",
	"+": "somar",
	"⌫": "apagar",
	".": "vírgula",
};

export function NewTransactionDialog({
	open,
	onOpenChange,
	defaults,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	defaults?: NewTransactionDefaults;
}) {
	const accounts = useAccounts().data ?? [];
	const categories = useCategories().data ?? [];
	const createTx = useCreateTransaction();
	const createTransfer = useCreateTransfer();

	const [kind, setKind] = useState<Kind>("expense");
	const [expr, setExpr] = useState("");
	const [accountId, setAccountId] = useState("");
	const [toAccountId, setToAccountId] = useState("");
	const [categoryId, setCategoryId] = useState("");
	const [date, setDate] = useState(todayInput());
	const [referenceMonth, setReferenceMonth] = useState(currentMonth());
	const [monthItemId, setMonthItemId] = useState("");
	const [note, setNote] = useState("");
	const [payee, setPayee] = useState("");
	const [pickerOpen, setPickerOpen] = useState(false);
	const [showExtras, setShowExtras] = useState(false);
	const amountRef = useRef<HTMLFieldSetElement>(null);

	useEffect(() => {
		if (!open) return;
		setKind(defaults?.kind ?? "expense");
		setExpr(defaults?.amount ? centsToExpr(defaults.amount) : "");
		setAccountId(defaults?.accountId ?? readLast());
		setToAccountId(defaults?.toAccountId ?? "");
		setCategoryId(defaults?.categoryId ?? "");
		setDate(todayInput());
		setReferenceMonth(defaults?.referenceMonth ?? currentMonth());
		setMonthItemId(defaults?.monthItemId ?? "");
		setNote("");
		setPayee("");
		setPickerOpen(false);
		setShowExtras(
			!!defaults?.referenceMonth && defaults.referenceMonth !== currentMonth(),
		);
	}, [open, defaults]);

	const activeAccounts = accounts.filter((a) => !a.archived);
	const accountsLoaded = accounts.length > 0;
	const isActive = (id: string) => activeAccounts.some((a) => a.id === id);

	useEffect(() => {
		if (!open || !accountsLoaded) return;
		if (accountId && !isActive(accountId)) setAccountId("");
		if (toAccountId && !isActive(toAccountId)) setToAccountId("");
	});
	const accountName = (id: string | null) =>
		accounts.find((a) => a.id === id)?.name ?? "—";

	const month = useMonthBudget(referenceMonth);
	const items = month.data?.items ?? [];
	const value = evaluate(expr);
	const cents = Math.round(value * 100);
	const hasOp = OPS.test(expr);
	const meta = KINDS[kind];

	const catColor = useMemo(() => {
		const map = new Map<string, string>();
		categories.forEach((c, i) => {
			map.set(c.id, c.color ?? PALETTE[i % PALETTE.length]!);
		});
		return map;
	}, [categories]);
	const category = categories.find((c) => c.id === categoryId);

	const explicitItem = items.find((i) => i.id === monthItemId);
	const autoItem =
		kind === "expense" && categoryId
			? items.find((i) => !i.toAccountId && i.categoryId === categoryId)
			: kind === "transfer" && toAccountId
				? items.find((i) => i.toAccountId === toAccountId)
				: undefined;
	const linkedItem = kind === "income" ? undefined : (explicitItem ?? autoItem);
	const linkUsable =
		!!linkedItem &&
		(linkedItem === explicitItem || linkedItem.status !== "paid");

	const templates = useMemo(() => {
		const open = (i: MonthItem) => i.status !== "paid" || i.partial;
		const amountOf = (i: MonthItem) => i.step ?? Math.max(i.remaining, 0);
		if (kind === "income") return [];
		return items
			.filter((i) =>
				kind === "transfer"
					? !!i.toAccountId
					: !i.toAccountId && !!i.categoryId,
			)
			.filter((i) => open(i) && amountOf(i) > 0)
			.slice(0, 6)
			.map((i) => ({
				item: i,
				amount: amountOf(i),
				label:
					kind === "transfer"
						? `${accountName(i.accountId ?? i.defaultAccountId)} → ${accountName(i.toAccountId)}`
						: i.name,
				color:
					kind === "transfer"
						? KINDS.transfer.accent
						: (catColor.get(i.categoryId ?? "") ?? "var(--color-dim)"),
			}));
	}, [items, kind, catColor, accounts]);

	const pending = createTx.isPending || createTransfer.isPending;
	const valid =
		cents > 0 &&
		!!accountId &&
		(kind === "transfer"
			? !!toAccountId && toAccountId !== accountId
			: !!categoryId);

	async function save(again: boolean) {
		if (!valid || pending) return;
		const occurredAt = instantOf(date);
		const itemId = linkUsable ? linkedItem!.id : null;
		if (kind === "transfer") {
			await createTransfer.mutateAsync({
				fromAccountId: accountId,
				toAccountId,
				amount: cents,
				occurredAt,
				referenceMonth,
				note: note || null,
				monthItemId: itemId,
			});
		} else {
			await createTx.mutateAsync({
				type: kind,
				accountId,
				categoryId,
				amount: cents,
				occurredAt,
				referenceMonth,
				note: note || null,
				payee: payee || null,
				monthItemId: itemId,
			});
		}
		writeLast(accountId);
		toast.success(`${meta.label} de ${money(cents)} MZN guardada`);
		if (again) {
			setExpr("");
			setCategoryId("");
			setMonthItemId("");
			setNote("");
			setPayee("");
			amountRef.current?.focus();
		} else {
			onOpenChange(false);
		}
	}

	function changeKind(next: Kind) {
		setKind(next);
		setCategoryId("");
		setMonthItemId("");
		setPickerOpen(false);
	}

	function onKeyDown(e: React.KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
			e.preventDefault();
			void save(e.shiftKey);
			return;
		}
		const target = e.target as HTMLElement;
		if (
			e.metaKey ||
			e.ctrlKey ||
			e.altKey ||
			pickerOpen ||
			target.closest("input, textarea, select")
		)
			return;
		const map: Record<string, string> = {
			",": ".",
			".": ".",
			"*": "×",
			x: "×",
			"/": "÷",
			"-": "−",
			"+": "+",
			Backspace: "⌫",
			"=": "=",
			Enter: "=",
		};
		const key = /^\d$/.test(e.key) ? e.key : map[e.key];
		if (!key) return;
		if (e.key === "Enter" && target.tagName === "BUTTON") return;
		e.preventDefault();
		setExpr((x) => press(x, key === "−" ? "-" : key));
	}

	const today = todayInput();
	const dateText =
		date === today
			? `hoje · ${dayLabel(date).split(" · ")[1]}`
			: dayLabel(date);
	const [refYear, refMonth] = referenceMonth.split("-").map(Number);
	const monthText = `mês: ${MONTH_SHORT[(refMonth ?? 1) - 1]} ${refYear}`;
	const monthOptions = (() => {
		const base = yearMonthOf(new Date(`${date}T12:00:00`));
		const list = [-2, -1, 0, 1, 2].map((d) => addMonths(base, d));
		return list.includes(referenceMonth) ? list : [referenceMonth, ...list];
	})();

	let linkText = "sem item da lista";
	let linkClass = "text-dim";
	if (kind === "income") linkText = "entrada · sem lista";
	else if (linkedItem && linkUsable) {
		linkText = `liga a ${linkedItem.name} · ${money(linkedItem.spent)} / ${money(linkedItem.plannedAmount)}`;
		linkClass = "text-money-2";
	} else if (linkedItem) {
		linkText = `${linkedItem.name} já está pago este mês`;
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next && pickerOpen) {
					setPickerOpen(false);
					return;
				}
				onOpenChange(next);
			}}
		>
			<DialogContent
				showCloseButton={false}
				initialFocus={amountRef}
				onKeyDown={onKeyDown}
				className="bg-panel text-fg rounded-overlay border-line-overlay shadow-overlay flex max-h-[88vh] w-[calc(100vw-32px)] max-w-[680px] flex-col gap-0 border p-0 text-[13px] ring-0 sm:max-w-[680px]"
			>
				<DialogTitle className="sr-only">Nova transacção</DialogTitle>

				<div className="border-line flex items-stretch border-b">
					<DialogClose
						aria-label="Fechar"
						className="text-dim hover:text-fg flex w-12 shrink-0 cursor-pointer items-center justify-center rounded-tl-[14px]"
					>
						<XIcon className="size-4" />
					</DialogClose>
					<div role="tablist" aria-label="Tipo" className="flex flex-1">
						{(Object.keys(KINDS) as Kind[]).map((k) => (
							<button
								key={k}
								type="button"
								role="tab"
								aria-selected={k === kind}
								onClick={() => changeKind(k)}
								className={cn(
									"text-dim hover:text-fg-2 h-10 flex-1 cursor-pointer border-b-2 border-transparent text-xs font-semibold tracking-[.02em] uppercase sm:text-[13px]",
									k === kind && "bg-surface-sunken",
								)}
								style={
									k === kind
										? {
												color: KINDS[k].accent,
												borderBottomColor: KINDS[k].accent,
											}
										: undefined
								}
							>
								{KINDS[k].label}
							</button>
						))}
					</div>
					<span className="num text-dim hidden items-center px-3.5 text-[11px] sm:flex">
						esc
					</span>
				</div>

				<div className="grid min-h-0 grid-cols-1 overflow-y-auto sm:grid-cols-[1fr_236px]">
					<div className="border-line relative flex min-w-0 flex-col gap-4 p-5 sm:border-r">
						<fieldset
							ref={amountRef}
							tabIndex={-1}
							aria-label={`Valor: ${money(cents)} MZN`}
							className="flex min-w-0 flex-col items-end gap-0.5 border-b px-1 pt-1 pb-2 outline-none"
							style={{ borderBottomColor: meta.accent }}
						>
							<span className="num text-dim min-h-4 text-xs">
								{hasOp ? expr.replace(/-/g, "−") : ""}
							</span>
							<div className="flex w-full items-baseline gap-2.5">
								<span
									className="num text-[34px]"
									style={{ color: meta.accent }}
								>
									{meta.sign}
								</span>
								<span
									aria-live="polite"
									className={cn(
										"num flex-1 truncate text-right text-[40px] leading-[1.1] font-medium sm:text-[52px]",
										cents > 0 ? "text-fg" : "text-faint",
									)}
								>
									{money(Math.max(cents, 0))}
									<span
										aria-hidden="true"
										className="h-input ml-1 inline-block w-0.5 animate-pulse align-[-4px] sm:h-[42px]"
										style={{ background: meta.accent }}
									/>
								</span>
								<span className="num text-dim text-base">MZN</span>
							</div>
						</fieldset>

						{kind === "transfer" ? (
							<div className="grid grid-cols-[1fr_28px_1fr] items-center gap-2">
								<AccountPick
									label="De"
									value={accountId}
									onChange={setAccountId}
									accounts={activeAccounts}
								/>
								<button
									type="button"
									aria-label="Trocar contas"
									onClick={() => {
										setAccountId(toAccountId);
										setToAccountId(accountId);
									}}
									className="num text-info-2 hover:text-info cursor-pointer text-center"
								>
									→
								</button>
								<AccountPick
									label="Para"
									value={toAccountId}
									onChange={(id) => {
										setToAccountId(id);
										setMonthItemId("");
									}}
									accounts={activeAccounts.filter((a) => a.id !== accountId)}
								/>
							</div>
						) : (
							<div className="grid grid-cols-2 gap-2">
								<AccountPick
									label="Conta"
									value={accountId}
									onChange={setAccountId}
									accounts={activeAccounts}
								/>
								<button
									type="button"
									onClick={() => setPickerOpen((o) => !o)}
									aria-expanded={pickerOpen}
									aria-haspopup="listbox"
									className={cn(
										"bg-canvas border-line-strong rounded-card flex w-full min-w-0 cursor-pointer flex-col items-stretch gap-[3px] border px-3 py-2.5 text-left",
										!category && "border-focus shadow-focus",
									)}
								>
									<small className="num text-dim text-[11px] tracking-[.06em] uppercase">
										Categoria
									</small>
									<span
										className={cn(
											"flex w-full min-w-0 items-center gap-2 text-[15px] font-medium",
											category ? "text-fg" : "text-info",
										)}
									>
										{category ? (
											<span
												className="size-2.5 shrink-0 rounded-[3px]"
												style={{ background: catColor.get(category.id) }}
											/>
										) : null}
										<span className="truncate">
											{category?.name ?? "Escolher"}
										</span>
									</span>
								</button>
							</div>
						)}

						{kind !== "transfer" && !category && !pickerOpen ? (
							<div className="num text-info -mt-2 text-right text-[11px]">
								↑ toda a transacção tem uma categoria
							</div>
						) : null}

						{kind !== "transfer" && pickerOpen ? (
							<CategoryPicker
								categories={categories}
								kind={kind}
								colorOf={(id) => catColor.get(id) ?? "var(--color-dim)"}
								onPick={(id) => {
									setCategoryId(id);
									setMonthItemId("");
									setPickerOpen(false);
									amountRef.current?.focus();
								}}
							/>
						) : null}

						{templates.length > 0 ? (
							<div className="flex flex-col gap-2">
								<span className="num text-dim text-[11px] tracking-[.06em] uppercase">
									Modelos
								</span>
								<div className="flex flex-wrap gap-1.5">
									{templates.map((t) => (
										<button
											key={t.item.id}
											type="button"
											onClick={() => {
												setExpr(centsToExpr(t.amount));
												setMonthItemId(t.item.id);
												if (kind === "transfer") {
													if (t.item.accountId ?? t.item.defaultAccountId)
														setAccountId(
															(t.item.accountId ?? t.item.defaultAccountId)!,
														);
													if (t.item.toAccountId)
														setToAccountId(t.item.toAccountId);
												} else {
													if (t.item.categoryId)
														setCategoryId(t.item.categoryId);
													if (t.item.defaultAccountId)
														setAccountId(t.item.defaultAccountId);
												}
												setPickerOpen(false);
											}}
											className="bg-canvas border-line-strong hover:border-info-2 h-row inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs whitespace-nowrap"
										>
											<i
												className="inline-block size-2 rounded-[2px]"
												style={{ background: t.color }}
											/>
											{t.label}
											<span className="num text-dim">{money(t.amount)}</span>
										</button>
									))}
								</div>
							</div>
						) : null}

						<div className="border-line flex flex-col gap-3 border-t pt-3">
							<div className="num text-dim flex flex-wrap gap-x-3.5 gap-y-1.5 text-[11px]">
								<span>{dateText}</span>
								<span>{monthText}</span>
								<span className={linkClass}>{linkText}</span>
								<button
									type="button"
									onClick={() => setShowExtras((s) => !s)}
									aria-expanded={showExtras}
									className="text-info-2 hover:text-info ml-auto cursor-pointer"
								>
									{showExtras ? "− nota, data" : "+ nota, data"}
								</button>
							</div>
							{showExtras ? (
								<div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
									<Field label="Data">
										<DatePicker
											value={date}
											onChange={(value) => setDate(value || today)}
										/>
									</Field>
									<Field label="Mês do orçamento">
										<Select
											value={referenceMonth}
											onValueChange={(value) => {
												setReferenceMonth(value);
												setMonthItemId("");
											}}
											items={monthOptions.map((m) => ({
												value: m,
												label: monthLabel(m),
											}))}
										/>
									</Field>
									<Field label="Nota">
										<Input
											value={note}
											onChange={(e) => setNote(e.target.value)}
											placeholder="opcional"
										/>
									</Field>
									{kind !== "transfer" ? (
										<Field label="Payee">
											<Input
												value={payee}
												onChange={(e) => setPayee(e.target.value)}
												placeholder="opcional"
											/>
										</Field>
									) : null}
								</div>
							) : null}
						</div>

						{accounts.length === 0 ? (
							<p className="text-warn text-xs">
								Crie uma conta primeiro (Contas › Nova conta).
							</p>
						) : null}
					</div>

					<div className="bg-panel-2 grid grid-cols-4 content-start gap-1.5 p-4 sm:rounded-br-[14px]">
						{KEYS.map((k) => {
							const op = OPS.test(k === "−" ? "-" : k) || k === "⌫";
							return (
								<button
									key={k}
									type="button"
									aria-label={KEY_LABEL[k] ?? k}
									onClick={() => setExpr((x) => press(x, k === "−" ? "-" : k))}
									className={cn(
										"num border-line hover:bg-surface-raised h-12 cursor-pointer rounded-lg border text-lg",
										op ? "bg-panel text-fg-2" : "bg-hover text-fg",
									)}
								>
									{k}
								</button>
							);
						})}
					</div>
				</div>

				<div className="border-line bg-panel-2 flex flex-wrap items-center gap-2 rounded-b-[14px] border-t px-4 py-3">
					<span className="num text-dim mr-auto hidden text-[11px] sm:inline">
						escreve o valor no teclado · tab muda de campo
					</span>
					<Button
						variant="neutral"
						disabled={!valid || pending}
						onClick={() => void save(true)}
						className="border-line-strong bg-hover text-fg rounded-control hover:bg-surface-raised inline-flex h-9 cursor-pointer items-center gap-2 border px-3.5 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-45"
					>
						Guardar e nova
						<span className="num rounded bg-white/8 px-1 text-[11px]">⇧⌘↵</span>
					</Button>
					<Button
						variant="primary"
						disabled={!valid || pending}
						onClick={() => void save(false)}
						className="border-money bg-money text-money-ink hover:bg-money-2 rounded-control inline-flex h-9 cursor-pointer items-center gap-2 border px-3.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-45"
					>
						Guardar
						<span className="num bg-money-ink/18 rounded px-1 text-[11px]">
							⌘↵
						</span>
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
