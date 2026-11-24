import type * as React from "react";

export function Page({ children }: { children: React.ReactNode }) {
	return (
		<main className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-6">
			{children}
		</main>
	);
}
