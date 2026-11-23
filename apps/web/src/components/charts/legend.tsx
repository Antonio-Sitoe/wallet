export function Legend({
	items,
}: {
	items: { label: string; color: string; line?: boolean }[];
}) {
	return (
		<div className="num text-dim flex flex-wrap gap-4 text-[11px]">
			{items.map((i) => (
				<span key={i.label} className="inline-flex items-center gap-1.5">
					{i.line ? (
						<span
							className="inline-block h-0.5 w-3.5 rounded-sm"
							style={{ background: i.color }}
						/>
					) : (
						<span
							className="inline-block size-2.5 rounded-sm"
							style={{ background: i.color }}
						/>
					)}
					{i.label}
				</span>
			))}
		</div>
	);
}
