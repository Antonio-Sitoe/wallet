import { TableHead } from "@wallet/ui/components/table";
import { cn } from "@wallet/ui/lib/utils";
import type * as React from "react";

export const STICKY_COLUMN =
	"sticky left-0 z-10 shadow-[1px_0_0_var(--color-line)] md:static md:shadow-none";

export const Th = ({
	children,
	right,
	sticky,
}: {
	children: React.ReactNode;
	right?: boolean;
	sticky?: boolean;
}) => (
	<TableHead
		scope="col"
		className={cn(
			"num border-line text-dim h-auto border-b px-3 py-2 text-[11px] font-medium tracking-[.06em] uppercase",
			right ? "text-right" : "text-left",
			sticky && `${STICKY_COLUMN} bg-panel-2`,
		)}
	>
		{children}
	</TableHead>
);
