export function CategoryOptions({
	categories,
	kind,
}: {
	categories: {
		id: string;
		name: string;
		parentId: string | null;
		kind: string;
		archived: boolean;
	}[];
	kind?: "expense" | "income";
}) {
	const visible = categories.filter((c) => !c.archived && c.kind !== "system");
	const tops = visible.filter((c) => !c.parentId);
	const matches = (c: { kind: string }) => !kind || c.kind === kind;
	return (
		<>
			{tops.map((top) => {
				const children = visible.filter((c) => c.parentId === top.id);
				if (!matches(top) && !children.some(matches)) return null;
				return [
					<option key={top.id} value={top.id}>
						{top.name}
					</option>,
					...children.map((c) => (
						<option key={c.id} value={c.id}>
							{"   "}
							{top.name} › {c.name}
						</option>
					)),
				];
			})}
		</>
	);
}
