import { cn } from "@wallet/ui/lib/utils";
import type * as React from "react";

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
