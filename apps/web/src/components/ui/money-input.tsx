import { cn } from "@wallet/ui/lib/utils";
import type * as React from "react";
import { inputBase } from "@/components/ui/utils";

export function MoneyInput({
	className,
	large,
	...props
}: React.InputHTMLAttributes<HTMLInputElement> & { large?: boolean }) {
	return (
		<input
			inputMode="decimal"
			className={cn(
				inputBase,
				"num",
				large && "h-[46px] text-[22px]",
				className,
			)}
			{...props}
		/>
	);
}
