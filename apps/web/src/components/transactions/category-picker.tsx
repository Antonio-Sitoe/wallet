import type { Category } from "@wallet/shared";
import { SearchIcon } from "lucide-react";
import { useState } from "react";

export function CategoryPicker({
	categories,
	kind,
	colorOf,
	onPick,
}: {
	categories: Category[];
	kind: "expense" | "income";
	colorOf: (id: string) => string;
	onPick: (id: string) => void;
}) {
	const [query, setQuery] = useState("");
	const visible = categories.filter(
		(c) => !c.archived && !c.isSystem && c.kind === kind,
	);
	const parentName = (c: Category) =>
		categories.find((p) => p.id === c.parentId)?.name;
	const ordered = visible
		.filter((c) => !c.parentId || !visible.some((p) => p.id === c.parentId))
		.flatMap((top) => [top, ...visible.filter((c) => c.parentId === top.id)]);
	const q = query.trim().toLowerCase();
	const shown = q
		? ordered.filter((c) =>
				`${parentName(c) ?? ""} ${c.name}`.toLowerCase().includes(q),
			)
		: ordered;

	return (
		<div
			role="listbox"
			aria-label="Escolher categoria"
			className="bg-hover -mt-2 flex w-full flex-col gap-2 rounded-xl border border-[#30363d] p-2.5"
		>
			<label className="border-line-strong bg-canvas flex h-8 items-center gap-2 rounded-[7px] border px-2.5">
				<SearchIcon aria-hidden="true" className="text-dim size-[13px]" />
				<span className="sr-only">Procurar categoria</span>
				<input
					type="search"
					autoFocus
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && shown[0]) {
							e.preventDefault();
							onPick(shown[0].id);
						}
					}}
					placeholder="categoria…"
					className="num text-fg h-7 min-w-0 flex-1 bg-transparent text-xs outline-none"
				/>
			</label>
			<div className="grid max-h-[260px] grid-cols-3 gap-0.5 overflow-y-auto sm:grid-cols-4">
				{shown.map((c) => {
					const color = colorOf(c.id);
					const parent = parentName(c);
					return (
						<button
							key={c.id}
							type="button"
							role="option"
							aria-selected={false}
							title={parent ? `${parent} › ${c.name}` : c.name}
							onClick={() => onPick(c.id)}
							className="hover:bg-hover hover:border-line-strong flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-transparent px-1 py-2.5 text-xs"
						>
							<b
								className="num flex size-[34px] items-center justify-center rounded-[9px] text-[13px]"
								style={{ background: `${color}26`, color }}
							>
								{c.name.slice(0, 2)}
							</b>
							<span className="max-w-[76px] truncate">{c.name}</span>
						</button>
					);
				})}
				{shown.length === 0 ? (
					<span className="num text-dim col-span-4 px-2 py-3 text-center text-[11px]">
						nenhuma categoria
					</span>
				) : null}
			</div>
		</div>
	);
}
