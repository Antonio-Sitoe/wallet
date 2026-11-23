import {
	FieldDescription,
	FieldLabel,
	Field as FieldRoot,
} from "@wallet/ui/components/field";
import { cn } from "@wallet/ui/lib/utils";
import {
	cloneElement,
	isValidElement,
	type ReactElement,
	type ReactNode,
	useId,
} from "react";

export function Field({
	label,
	children,
	hint,
	className,
}: {
	label: string;
	children: ReactNode;
	hint?: ReactNode;
	className?: string;
}) {
	const generatedId = useId();
	const control = isValidElement<{ id?: string }>(children)
		? (children as ReactElement<{ id?: string }>)
		: null;
	const id = control?.props.id ?? generatedId;

	return (
		<FieldRoot className={cn("min-w-0 gap-1.5", className)}>
			<FieldLabel htmlFor={id} className="text-fg-2 text-xs font-normal">
				{label}
			</FieldLabel>
			{control ? cloneElement(control, { id }) : children}
			{hint ? (
				<FieldDescription className="num text-dim text-[11px]">
					{hint}
				</FieldDescription>
			) : null}
		</FieldRoot>
	);
}
