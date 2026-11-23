import { Input } from "@wallet/ui/components/input";
import { cn } from "@wallet/ui/lib/utils";
import type * as React from "react";

export function MoneyInput({
	className,
	large,
	...props
}: React.ComponentProps<typeof Input> & { large?: boolean }) {
	return (
		<Input
			inputMode="decimal"
			className={cn(
				"num",
				large && "h-11.5 text-[22px] md:text-[22px]",
				className,
			)}
			{...props}
		/>
	);
}
