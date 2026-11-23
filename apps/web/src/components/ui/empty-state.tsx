import type * as React from "react";
import { Card } from "@/components/ui/card";

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
		<Card className="border-line-strong flex flex-col items-center gap-4 border-dashed px-6 py-12 text-center">
			<h2 className="text-[17px] font-semibold">{title}</h2>
			{children ? (
				<div className="text-fg-2 max-w-[460px] leading-relaxed">
					{children}
				</div>
			) : null}
			{actions ? (
				<div className="flex flex-wrap justify-center gap-2">{actions}</div>
			) : null}
		</Card>
	);
}
