/** The small set of building blocks every screen uses, styled after the design boards. */
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { cn } from "@wallet/ui/lib/utils";
import { XIcon } from "lucide-react";
import type * as React from "react";

import { STATUS_LABEL } from "@/lib/format";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonStyles: Record<ButtonVariant, string> = {
	primary:
		"border-money bg-money font-semibold text-money-ink hover:bg-money-2",
	secondary: "border-line-strong bg-hover text-fg hover:bg-[#1c2128]",
	ghost:
		"border-transparent bg-transparent text-fg-2 hover:bg-hover hover:text-fg",
	danger: "border-danger-line bg-danger-bg text-danger hover:bg-[#3a171b]",
};

export function Button({
	variant = "secondary",
	size = "md",
	className,
	...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: ButtonVariant;
	size?: "sm" | "md";
}) {
	return (
		<button
			type="button"
			className={cn(
				"focus-visible:ring-info-2/30 inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50",
				size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[13px]",
				buttonStyles[variant],
				className,
			)}
			{...props}
		/>
	);
}

export function Kbd({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<kbd
			className={cn(
				"num border-line-strong bg-hover text-fg-2 rounded border px-1.5 text-[11px]",
				className,
			)}
		>
			{children}
		</kbd>
	);
}

export function Card({
	className,
	...props
}: React.HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "aside" }) {
	return (
		<section
			className={cn("border-line bg-panel rounded-[10px] border", className)}
			{...props}
		/>
	);
}

export function CardHeader({
	title,
	meta,
	actions,
}: {
	title: React.ReactNode;
	meta?: React.ReactNode;
	actions?: React.ReactNode;
}) {
	return (
		<div className="border-line flex flex-wrap items-center justify-between gap-2 border-b px-3.5 py-3">
			<div className="flex min-w-0 flex-col gap-0.5">
				<h2 className="text-sm font-semibold">{title}</h2>
				{meta ? <span className="num text-dim text-[11px]">{meta}</span> : null}
			</div>
			{actions ? (
				<div className="flex flex-wrap items-center gap-2">{actions}</div>
			) : null}
		</div>
	);
}

export const Label = ({ children }: { children: React.ReactNode }) => (
	<span className="num text-dim text-[11px] tracking-[.06em] uppercase">
		{children}
	</span>
);

export function Field({
	label,
	children,
	hint,
	className,
}: {
	label: string;
	children: React.ReactNode;
	hint?: React.ReactNode;
	className?: string;
}) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: the control is passed in as children
		<label
			className={cn(
				"text-fg-2 flex min-w-0 flex-col gap-1.5 text-xs",
				className,
			)}
		>
			{label}
			{children}
			{hint ? <span className="num text-dim text-[11px]">{hint}</span> : null}
		</label>
	);
}

const inputBase =
	"h-[34px] w-full min-w-0 rounded-md border border-line-strong bg-canvas px-2.5 text-[13px] text-fg outline-none placeholder:text-faint focus:border-info-2 focus:ring-3 focus:ring-info-2/25 disabled:opacity-60";

export function TextInput({
	className,
	...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
	return <input className={cn(inputBase, className)} {...props} />;
}

export function Select({
	className,
	children,
	...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
	return (
		<select
			className={cn(inputBase, "cursor-pointer pr-7", className)}
			{...props}
		>
			{children}
		</select>
	);
}

/** Money typed as "1 500,50"; the parent parses it with parseMoney. */
export function MoneyInput({
	className,
	large,
	...props
}: React.InputHTMLAttributes<HTMLInputElement> & { large?: boolean }) {
	return (
		<input
			inputMode="decimal"
			className={cn(
				inputBase,
				"num",
				large && "h-[46px] text-[22px]",
				className,
			)}
			{...props}
		/>
	);
}

/** Segmented control. */
export function Segmented<T extends string>({
	value,
	options,
	onChange,
	className,
}: {
	value: T;
	options: { value: T; label: string }[];
	onChange: (v: T) => void;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"border-line bg-canvas flex gap-0.5 rounded-lg border p-[3px]",
				className,
			)}
		>
			{options.map((o) => (
				<button
					key={o.value}
					type="button"
					aria-pressed={value === o.value}
					onClick={() => onChange(o.value)}
					className={cn(
						"text-fg-2 h-7 flex-1 cursor-pointer rounded-md px-3 text-xs",
						value === o.value && "bg-info-bg text-info font-medium",
					)}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}

const pillTones = {
	neutral: "border-line-strong bg-hover text-fg-2",
	ok: "border-money-line bg-money-bg text-money-2",
	warn: "border-warn-line bg-warn-bg text-warn",
	info: "border-info-line bg-info-bg text-info",
	danger: "border-danger-line bg-danger-bg text-danger",
} as const;

export function Pill({
	tone = "neutral",
	children,
	className,
}: {
	tone?: keyof typeof pillTones;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"num inline-block rounded-full border px-2 py-0.5 text-[11px] whitespace-nowrap",
				pillTones[tone],
				className,
			)}
		>
			{children}
		</span>
	);
}

const statusTone = {
	unpaid: "neutral",
	partial: "info",
	paid: "ok",
	over: "warn",
} as const;
export const StatusPill = ({ status }: { status: keyof typeof statusTone }) => (
	<Pill tone={statusTone[status]}>{STATUS_LABEL[status]}</Pill>
);

export function Stat({
	label,
	value,
	note,
	tone,
}: {
	label: string;
	value: React.ReactNode;
	note?: React.ReactNode;
	tone?: "ok" | "warn" | "dim";
}) {
	return (
		<div className="flex min-w-0 flex-col gap-1.5 px-4 py-3.5">
			<Label>{label}</Label>
			<span
				className={cn(
					"num text-xl",
					tone === "ok" && "text-money",
					tone === "warn" && "text-warn",
					tone === "dim" && "text-faint",
				)}
			>
				{value}
			</span>
			{note ? <span className="num text-dim text-[11px]">{note}</span> : null}
		</div>
	);
}

export function StatRow({ children }: { children: React.ReactNode }) {
	return (
		<Card className="divide-line [&>*+*]:border-line grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] overflow-hidden [&>*+*]:border-l">
			{children}
		</Card>
	);
}

export function ProgressBar({
	value,
	max,
	over,
}: {
	value: number;
	max: number;
	over?: boolean;
}) {
	const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
	return (
		<span
			className="bg-hover block h-1 overflow-hidden rounded-sm"
			role="progressbar"
			aria-valuenow={pct}
			aria-valuemin={0}
			aria-valuemax={100}
		>
			<span
				className={cn("block h-1", over ? "bg-[#f0883e]" : "bg-money")}
				style={{ width: `${pct}%` }}
			/>
		</span>
	);
}

export function PageHeader({
	crumb,
	children,
}: {
	crumb: string[];
	children?: React.ReactNode;
}) {
	return (
		<header className="border-line bg-panel-2 flex min-h-[52px] flex-wrap items-center justify-between gap-3 border-b px-6 py-2">
			<div className="num text-dim text-xs">
				{["wallet", ...crumb].map((part, i, all) => (
					<span key={part}>
						{i === all.length - 1 ? (
							<b className="text-fg font-normal">{part}</b>
						) : (
							part
						)}
						{i < all.length - 1 ? (
							<i className="text-faint px-1.5 not-italic">/</i>
						) : null}
					</span>
				))}
			</div>
			<div className="flex flex-wrap items-center gap-2">{children}</div>
		</header>
	);
}

export function PageTitle({
	title,
	meta,
}: {
	title: React.ReactNode;
	meta?: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1">
			<h1 className="text-[22px] font-semibold tracking-[-.01em]">{title}</h1>
			{meta ? <div className="num text-dim text-xs">{meta}</div> : null}
		</div>
	);
}

export function Page({ children }: { children: React.ReactNode }) {
	return (
		<main className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-6">
			{children}
		</main>
	);
}

export function EmptyState({
	title,
	children,
	actions,
}: {
	title: string;
	children?: React.ReactNode;
	actions?: React.ReactNode;
}) {
	return (
		<Card className="border-line-strong flex flex-col items-center gap-4 border-dashed px-6 py-12 text-center">
			<h2 className="text-[17px] font-semibold">{title}</h2>
			{children ? (
				<div className="text-fg-2 max-w-[460px] leading-relaxed">
					{children}
				</div>
			) : null}
			{actions ? (
				<div className="flex flex-wrap justify-center gap-2">{actions}</div>
			) : null}
		</Card>
	);
}

export function Skeleton({ className }: { className?: string }) {
	return <div className={cn("bg-hover animate-pulse rounded-md", className)} />;
}

export function ErrorNote({ error }: { error: unknown }) {
	return (
		<Card className="border-danger-line bg-danger-bg text-danger px-4 py-3">
			{error instanceof Error
				? error.message
				: "Não foi possível carregar os dados."}
		</Card>
	);
}

/** Coloured square used for categories and accounts. */
export function Swatch({
	color,
	label,
	className,
}: {
	color?: string | null;
	label?: string;
	className?: string;
}) {
	const c = color ?? "#8B949E";
	return (
		<span
			aria-hidden="true"
			className={cn(
				"num inline-flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
				className,
			)}
			style={{ background: `${c}24`, color: c }}
		>
			{label}
		</span>
	);
}

export function Dialog({
	open,
	onOpenChange,
	title,
	description,
	children,
	footer,
	width = 560,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: React.ReactNode;
	description?: React.ReactNode;
	children: React.ReactNode;
	footer?: React.ReactNode;
	width?: number;
}) {
	return (
		<BaseDialog.Root open={open} onOpenChange={onOpenChange}>
			<BaseDialog.Portal>
				<BaseDialog.Backdrop className="fixed inset-0 z-40 bg-[rgba(1,4,9,.66)]" />
				<BaseDialog.Popup
					className="bg-panel text-fg fixed top-[8vh] left-1/2 z-50 flex max-h-[84vh] w-[calc(100vw-32px)] -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-[#30363d] shadow-[0_24px_64px_rgba(1,4,9,.7)] outline-none"
					style={{ maxWidth: width }}
				>
					<div className="border-line flex items-start justify-between gap-3 border-b px-[18px] py-3.5">
						<div className="flex flex-col gap-1">
							<BaseDialog.Title className="text-[15px] font-semibold">
								{title}
							</BaseDialog.Title>
							{description ? (
								<BaseDialog.Description className="num text-dim text-[11px]">
									{description}
								</BaseDialog.Description>
							) : null}
						</div>
						<BaseDialog.Close
							aria-label="Fechar"
							className="text-dim hover:bg-hover hover:text-fg cursor-pointer rounded-md p-1"
						>
							<XIcon className="size-4" />
						</BaseDialog.Close>
					</div>
					<div className="flex flex-col gap-3.5 overflow-y-auto p-[18px]">
						{children}
					</div>
					{footer ? (
						<div className="border-line bg-panel-2 flex flex-wrap items-center justify-end gap-2 border-t px-[18px] py-3">
							{footer}
						</div>
					) : null}
				</BaseDialog.Popup>
			</BaseDialog.Portal>
		</BaseDialog.Root>
	);
}

/** Category <option>s: top level, then children indented. */
export function CategoryOptions({
	categories,
	kind,
}: {
	categories: {
		id: string;
		name: string;
		parentId: string | null;
		kind: string;
		archived: boolean;
	}[];
	kind?: "expense" | "income";
}) {
	const visible = categories.filter((c) => !c.archived && c.kind !== "system");
	const tops = visible.filter((c) => !c.parentId);
	const matches = (c: { kind: string }) => !kind || c.kind === kind;
	return (
		<>
			{tops.map((top) => {
				const children = visible.filter((c) => c.parentId === top.id);
				if (!matches(top) && !children.some(matches)) return null;
				return [
					<option key={top.id} value={top.id}>
						{top.name}
					</option>,
					...children.map((c) => (
						<option key={c.id} value={c.id}>
							{"   "}
							{top.name} › {c.name}
						</option>
					)),
				];
			})}
		</>
	);
}
