import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@wallet/ui/components/tooltip";
import type * as React from "react";

export function Hint({
	label,
	wrap,
	children,
}: {
	label?: React.ReactNode;
	wrap?: boolean;
	children: React.ReactElement;
}) {
	if (!label) return children;
	return (
		<Tooltip>
			{wrap ? (
				<TooltipTrigger render={<span className="inline-flex" />}>
					{children}
				</TooltipTrigger>
			) : (
				<TooltipTrigger render={children} />
			)}
			<TooltipContent className="bg-popover text-fg border-line-strong border [&>[data-side]]:hidden">
				{label}
			</TooltipContent>
		</Tooltip>
	);
}
