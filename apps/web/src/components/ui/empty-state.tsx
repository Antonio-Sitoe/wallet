import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@wallet/ui/components/empty";
import type * as React from "react";

export function EmptyState({
	title,
	children,
	actions,
}: {
	title: string;
	children?: React.ReactNode;
	actions?: React.ReactNode;
}) {
	return (
		<Empty className="border-line-strong bg-panel rounded-[10px] border border-dashed px-6 py-12">
			<EmptyHeader className="max-w-[460px]">
				<EmptyTitle className="text-fg text-[17px] font-semibold">
					{title}
				</EmptyTitle>
				{children ? (
					<EmptyDescription className="text-fg-2 text-[13px] leading-relaxed">
						{children}
					</EmptyDescription>
				) : null}
			</EmptyHeader>
			{actions ? (
				<EmptyContent className="flex-row flex-wrap justify-center gap-2">
					{actions}
				</EmptyContent>
			) : null}
		</Empty>
	);
}
