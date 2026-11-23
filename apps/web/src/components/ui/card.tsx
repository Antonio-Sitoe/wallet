import { Card as CardRoot } from "@wallet/ui/components/card";
import { cn } from "@wallet/ui/lib/utils";
import type * as React from "react";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<CardRoot
			className={cn(
				"border-line bg-panel text-fg gap-0 rounded-[10px] border py-0 text-[13px] ring-0",
				className,
			)}
			{...props}
		/>
	);
}
