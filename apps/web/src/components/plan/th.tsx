export const Th = ({
	children,
	right,
}: {
	children: React.ReactNode;
	right?: boolean;
}) => (
	<th
		scope="col"
		className={`num border-line text-dim border-b px-3 py-2 text-[11px] font-medium tracking-[.06em] uppercase ${right ? "text-right" : "text-left"}`}
	>
		{children}
	</th>
);
