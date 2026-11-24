import { cn } from "@wallet/ui/lib/utils";
import type { ReactNode } from "react";

export function SettingsSection({
	title,
	description,
	children,
}: {
	title: string;
	description?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-1">
			<header className="flex flex-col gap-1 pb-2">
				<h3 className="text-fg text-[15px] font-semibold">{title}</h3>
				{description ? (
					<p className="text-dim text-[12px] leading-relaxed">{description}</p>
				) : null}
			</header>
			<div className="divide-line flex flex-col divide-y">{children}</div>
		</section>
	);
}

export function SettingsRow({
	title,
	description,
	children,
	htmlFor,
	stacked,
	className,
}: {
	title: ReactNode;
	description?: ReactNode;
	children?: ReactNode;
	htmlFor?: string;
	stacked?: boolean;
	className?: string;
}) {
	const Label = htmlFor ? "label" : "div";
	return (
		<div
			className={cn(
				"flex gap-x-6 gap-y-2.5 py-3.5",
				stacked
					? "flex-col"
					: "flex-col sm:flex-row sm:items-center sm:justify-between",
				className,
			)}
		>
			<Label htmlFor={htmlFor} className="flex min-w-0 flex-col gap-0.5">
				<span className="text-fg text-[13px]">{title}</span>
				{description ? (
					<span className="text-dim text-[12px] leading-relaxed">
						{description}
					</span>
				) : null}
			</Label>
			{children ? (
				<div className="flex shrink-0 items-center gap-2">{children}</div>
			) : null}
		</div>
	);
}

export function SettingsValue({ children }: { children: ReactNode }) {
	return <span className="num text-fg-2 text-xs">{children}</span>;
}
