import { Checkbox } from "@wallet/ui/components/checkbox";
import type * as React from "react";

export const Check = ({
	checked,
	onChange,
	children,
}: {
	checked: boolean;
	onChange: (v: boolean) => void;
	children: React.ReactNode;
}) => (
	<label className="text-fg-2 flex cursor-pointer items-center gap-2.5">
		<Checkbox checked={checked} onCheckedChange={onChange} />
		{children}
	</label>
);
