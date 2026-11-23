import { cn } from "@wallet/ui/lib/utils";
import type * as React from "react";
import { inputBase } from "@/components/ui/utils";

export function Select({
	className,
	children,
	...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
	return (
		<select
			className={cn(inputBase, "cursor-pointer pr-7", className)}
			{...props}
		>
			{children}
		</select>
	);
}
