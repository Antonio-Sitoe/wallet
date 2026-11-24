import { Button } from "@wallet/ui/components/button";
import { cn } from "@wallet/ui/lib/utils";
import type * as React from "react";
import { Hint } from "@/components/ui/hint";

export function IconButton({
	label,
	children,
	onClick,
	disabled,
	className,
}: {
	className?: string;
	label: string;
	children: React.ReactNode;
	onClick: () => void;
	disabled?: boolean;
}) {
	return (
		<Hint label={label}>
			<Button
				variant="neutral"
				size="icon-sm"
				aria-label={label}
				disabled={disabled}
				onClick={onClick}
				className={cn("text-fg-2 hover:text-fg disabled:opacity-30", className)}
			>
				{children}
			</Button>
		</Hint>
	);
}
