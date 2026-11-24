import { cn } from "@wallet/ui/lib/utils";
import type * as React from "react";
import { Label } from "@/components/ui/label";

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
