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
		<CardHeaderRoot className="border-line items-center gap-0.5 border-b px-3.5 py-3">
			<CardTitle className="text-sm font-semibold">{title}</CardTitle>
			{meta ? (
				<CardDescription className="num text-dim text-[11px]">
					{meta}
				</CardDescription>
			) : null}
			{actions ? (
				<CardAction className="row-span-2 flex flex-wrap items-center gap-2 self-center">
					{actions}
				</CardAction>
			) : null}
		</CardHeaderRoot>
	);
}
