import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@wallet/ui/components/breadcrumb";
import type * as React from "react";
import { Fragment } from "react";

export function PageHeader({
	crumb,
	children,
}: {
	crumb: string[];
	children?: React.ReactNode;
}) {
	const parts = ["wallet", ...crumb];
	return (
		<header className="border-line bg-panel-2 flex min-h-13 flex-wrap items-center justify-between gap-3 border-b px-6 py-2">
			<Breadcrumb>
				<BreadcrumbList className="num text-dim gap-1.5 text-xs">
					{parts.map((part, i) => (
						<Fragment key={part}>
							<BreadcrumbItem>
								{i === parts.length - 1 ? (
									<BreadcrumbPage className="text-fg">{part}</BreadcrumbPage>
								) : (
									part
								)}
							</BreadcrumbItem>
							{i < parts.length - 1 ? (
								<BreadcrumbSeparator className="text-faint">
									/
								</BreadcrumbSeparator>
							) : null}
						</Fragment>
					))}
				</BreadcrumbList>
			</Breadcrumb>
			<div className="flex flex-wrap items-center gap-2">{children}</div>
		</header>
	);
}
