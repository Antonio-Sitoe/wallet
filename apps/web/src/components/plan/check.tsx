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
		<input
			type="checkbox"
			checked={checked}
			onChange={(e) => onChange(e.target.checked)}
			className="size-4 accent-[#3FB950]"
		/>
		{children}
	</label>
);
