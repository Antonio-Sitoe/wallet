import { cn } from "@wallet/ui/lib/utils";
import type * as React from "react";
import { inputBase } from "@/components/ui/utils";

export function TextInput({
	className,
	...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
	return <input className={cn(inputBase, className)} {...props} />;
}
