import type { Category, Transaction } from "@wallet/shared";
import { Pill } from "@/components/ui/pill";
import { ink, tint } from "@/utils/color";
import { monthLabel, signedMoney } from "@/utils/format";

export function TxRow({
	tx,
	selected,
	category,
	account,
	counterpart,
	onSelect,
}: {
	tx: Transaction;
	selected: boolean;
	category?: Category;
	account: string;
	counterpart: string | null;
	onSelect: () => void;
}) {
	const isAdjustment = tx.type === "adjustment";
	const isTransfer = tx.type === "transfer" || isAdjustment;
	const title = isAdjustment
		? "Acerto de saldo"
		: isTransfer
			? tx.amount < 0
				? `→ ${counterpart}`
				: `← ${counterpart}`
			: (category?.name ?? "Sem categoria");
	const meta = [
		account,
		tx.payee,
		tx.labels.map((l) => `#${l}`).join(" "),
		tx.note,
		`mês ${monthLabel(tx.referenceMonth).toLowerCase()}`,
	]
		.filter(Boolean)
		.join(" · ");
	const color = category?.color ?? "var(--color-dim)";
	return (
		<button
			type="button"
			onClick={onSelect}
			aria-pressed={selected}
			className={`border-hover hover:bg-hover max-md:border-line flex w-full cursor-pointer items-center gap-3 border-b px-3.5 py-2.5 text-left max-md:min-h-[60px] ${selected ? "bg-hover shadow-[inset_0_0_0_1px_var(--color-info-2)]" : ""}`}
		>
			<span
				aria-hidden="true"
				className="num flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold max-md:size-9 max-md:rounded-[10px] max-md:text-sm"
				style={
					isTransfer
						? { background: "var(--color-hover)", color: "var(--color-dim)" }
						: { background: tint(color), color: ink(color) }
				}
			>
				{isAdjustment ? "≈" : isTransfer ? "⇄" : title[0]}
			</span>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="truncate font-medium max-md:text-[15px]">
					{title}{" "}
					{tx.monthItemId ? (
						<Pill tone="ok" className="ml-1">
							lista
						</Pill>
					) : null}
				</span>
				<span className="num text-dim truncate text-[11px] max-md:font-sans max-md:text-xs">
					{meta}
				</span>
			</span>
			<span
				className={`num max-md:text-[15px] max-md:font-semibold ${tx.amount > 0 && !isTransfer ? "text-money" : isTransfer ? "text-dim" : ""}`}
			>
				{signedMoney(tx.amount)}
			</span>
		</button>
	);
}
