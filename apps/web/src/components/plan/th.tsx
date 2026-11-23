import { TableHead } from "@wallet/ui/components/table";
import { cn } from "@wallet/ui/lib/utils";
import type * as React from "react";

export const Th = ({
	children,
	right,
}: {
	children: React.ReactNode;
	right?: boolean;
}) => (
	<TableHead
		scope="col"
		className={cn(
			"num border-line text-dim h-auto border-b px-3 py-2 text-[11px] font-medium tracking-[.06em] uppercase",
			right ? "text-right" : "text-left",
		)}
	>
		{children}
	</TableHead>
);
