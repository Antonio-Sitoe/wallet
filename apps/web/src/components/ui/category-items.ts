import type { SelectOption } from "@/components/ui/select";

type CategoryLike = {
	id: string;
	name: string;
	parentId: string | null;
	kind: string;
	archived: boolean;
};

export function categoryItems(
	categories: CategoryLike[],
	kind?: "expense" | "income",
): SelectOption[] {
	const visible = categories.filter((c) => !c.archived && c.kind !== "system");
	const tops = visible.filter((c) => !c.parentId);
	const matches = (c: { kind: string }) => !kind || c.kind === kind;
	return tops.flatMap((top) => {
		const children = visible.filter((c) => c.parentId === top.id);
		if (!matches(top) && !children.some(matches)) return [];
		return [
			{ value: top.id, label: top.name },
			...children.map((c) => ({
				value: c.id,
				label: `${top.name} › ${c.name}`,
			})),
		];
	});
}
