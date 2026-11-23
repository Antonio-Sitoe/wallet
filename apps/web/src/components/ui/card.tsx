import { cn } from "@wallet/ui/lib/utils";
import type * as React from "react";

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
