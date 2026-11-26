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
			<h1 className="text-[22px] font-semibold tracking-[-.01em] max-md:text-[30px] max-md:leading-[36px] max-md:font-bold max-md:tracking-[-.02em]">
				{title}
			</h1>
			{meta ? (
				<div className="num text-dim text-xs max-md:font-sans max-md:text-sm">{meta}</div>
			) : null}
		</div>
	);
}
