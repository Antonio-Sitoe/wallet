import type * as React from "react";

export function PageHeader({
	crumb,
	children,
}: {
	crumb: string[];
	children?: React.ReactNode;
}) {
	return (
		<header className="border-line bg-panel-2 flex min-h-[52px] flex-wrap items-center justify-between gap-3 border-b px-6 py-2">
			<div className="num text-dim text-xs">
				{["wallet", ...crumb].map((part, i, all) => (
					<span key={part}>
						{i === all.length - 1 ? (
							<b className="text-fg font-normal">{part}</b>
						) : (
							part
						)}
						{i < all.length - 1 ? (
							<i className="text-faint px-1.5 not-italic">/</i>
						) : null}
					</span>
				))}
			</div>
			<div className="flex flex-wrap items-center gap-2">{children}</div>
		</header>
	);
}
