import type { Category } from "@wallet/shared";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@wallet/ui/components/input-group";
import { SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Hint } from "@/components/ui/hint";
import { tint } from "@/utils/color";

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
	const searchRef = useRef<HTMLInputElement>(null);
	useEffect(() => searchRef.current?.focus(), []);
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
			className="bg-hover border-line-overlay -mt-2 flex w-full flex-col gap-2 rounded-xl border p-2.5"
		>
			<InputGroup className="border-line-strong bg-canvas rounded-control h-8">
				<InputGroupAddon>
					<SearchIcon aria-hidden="true" className="text-dim size-[13px]" />
				</InputGroupAddon>
				<InputGroupInput
					ref={searchRef}
					type="search"
					aria-label="Procurar categoria"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && shown[0]) {
							e.preventDefault();
							onPick(shown[0].id);
						}
					}}
					placeholder="categoria…"
					className="num text-fg h-7 text-xs md:text-xs"
				/>
			</InputGroup>
			<div className="grid max-h-[260px] grid-cols-3 gap-0.5 overflow-y-auto sm:grid-cols-4">
				{shown.map((c) => {
					const color = colorOf(c.id);
					const parent = parentName(c);
					return (
						<Hint key={c.id} label={parent ? `${parent} › ${c.name}` : c.name}>
							<button
								type="button"
								role="option"
								aria-selected={false}
								onClick={() => onPick(c.id)}
								className="hover:bg-hover hover:border-line-strong flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-transparent px-1 py-2.5 text-xs"
							>
								<b
									className="num flex size-[34px] items-center justify-center rounded-[9px] text-[13px]"
									style={{ background: tint(color, 15), color }}
								>
									{c.name.slice(0, 2)}
								</b>
								<span className="max-w-[76px] truncate">{c.name}</span>
							</button>
						</Hint>
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
