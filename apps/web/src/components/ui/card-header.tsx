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
		<div className="border-line flex flex-wrap items-center justify-between gap-2 border-b px-3.5 py-3">
			<div className="flex min-w-0 flex-col gap-0.5">
				<h2 className="text-sm font-semibold">{title}</h2>
				{meta ? <span className="num text-dim text-[11px]">{meta}</span> : null}
			</div>
			{actions ? (
				<div className="flex flex-wrap items-center gap-2">{actions}</div>
			) : null}
		</div>
	);
}
