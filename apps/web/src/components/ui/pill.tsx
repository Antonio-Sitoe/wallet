import { cn } from "@wallet/ui/lib/utils";
import type * as React from "react";

export const pillTones = {
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
