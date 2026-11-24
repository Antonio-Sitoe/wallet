export const Legend = ({
	color,
	children,
}: {
	color: string;
	children: React.ReactNode;
}) => (
	<span className="inline-flex items-center gap-1.5">
		<span className="size-2.5 rounded-sm" style={{ background: color }} />
		{children}
	</span>
);
