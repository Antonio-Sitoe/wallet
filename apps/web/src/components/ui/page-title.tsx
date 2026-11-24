import type * as React from "react";

export function PageTitle({
	title,
	meta,
}: {
	title: React.ReactNode;
	meta?: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1">
			<h1 className="text-[22px] font-semibold tracking-[-.01em]">{title}</h1>
			{meta ? <div className="num text-dim text-xs">{meta}</div> : null}
		</div>
	);
}
