import {
	CardAction,
	CardDescription,
	CardHeader as CardHeaderRoot,
	CardTitle,
} from "@wallet/ui/components/card";
import type * as React from "react";

export function CardHeader({
	title,
	meta,
	actions,
}: {
	title: React.ReactNode;
	meta?: React.ReactNode;
	actions?: React.ReactNode;
}) {
	return (
		<CardHeaderRoot className="border-line items-center gap-0.5 border-b px-3.5 py-3 max-sm:has-data-[slot=card-action]:grid-cols-1">
			<CardTitle className="text-sm font-semibold">{title}</CardTitle>
			{meta ? (
				<CardDescription className="num text-dim text-[11px]">
					{meta}
				</CardDescription>
			) : null}
			{actions ? (
				<CardAction className="flex flex-wrap items-center gap-2 max-sm:col-start-1 max-sm:row-span-1 max-sm:row-start-auto max-sm:mt-2 max-sm:justify-self-start sm:row-span-2 sm:self-center">
					{actions}
				</CardAction>
			) : null}
		</CardHeaderRoot>
	);
}
