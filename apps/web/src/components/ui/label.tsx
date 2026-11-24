import type * as React from "react";

export const Label = ({ children }: { children: React.ReactNode }) => (
	<span className="num text-dim text-[11px] tracking-[.06em] uppercase">
		{children}
	</span>
);
