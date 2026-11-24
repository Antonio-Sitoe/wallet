import { Badge } from "@wallet/ui/components/badge";
import { cn } from "@wallet/ui/lib/utils";
import type * as React from "react";

export type PillTone = "neutral" | "ok" | "warn" | "info" | "danger";

export function Pill({
	tone = "neutral",
	children,
	className,
}: {
	tone?: PillTone;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<Badge
			variant={tone}
			className={cn(
				"num h-auto px-2 py-0.5 text-[11px] font-normal",
				className,
			)}
		>
			{children}
		</Badge>
	);
}
