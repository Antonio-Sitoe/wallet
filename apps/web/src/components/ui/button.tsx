import { cn } from "@wallet/ui/lib/utils";
import type * as React from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export const buttonStyles: Record<ButtonVariant, string> = {
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
