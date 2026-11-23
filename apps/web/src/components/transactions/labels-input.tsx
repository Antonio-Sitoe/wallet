import { XIcon } from "lucide-react";
import { useId, useState } from "react";
import { useLabels } from "@/actions/transactions/use-labels";

const MAX_LABELS = 10;

export function LabelsInput({
	id,
	value,
	onChange,
}: {
	id?: string;
	value: string[];
	onChange: (next: string[]) => void;
}) {
	const listId = useId();
	const [draft, setDraft] = useState("");
	const known = useLabels().data ?? [];
	const suggestions = known
		.map((l) => l.name)
		.filter((name) => !value.includes(name));

	const add = (raw: string) => {
		const name = raw.trim().slice(0, 40);
		setDraft("");
		if (!name || value.length >= MAX_LABELS) return;
		const existing = known.find(
			(l) => l.name.toLowerCase() === name.toLowerCase(),
		);
		const picked = existing?.name ?? name;
		if (!value.includes(picked)) onChange([...value, picked]);
	};

	return (
		<div className="border-line-strong bg-canvas focus-within:border-info-2 focus-within:shadow-focus rounded-control min-h-input flex flex-wrap items-center gap-1 border px-1.5 py-1">
			{value.map((name) => (
				<span
					key={name}
					className="num bg-info-bg text-info-fg flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]"
				>
					{name}
					<button
						type="button"
						aria-label={`Tirar a etiqueta ${name}`}
						className="hover:text-fg cursor-pointer"
						onClick={() => onChange(value.filter((v) => v !== name))}
					>
						<XIcon className="size-3" />
					</button>
				</span>
			))}
			<input
				id={id}
				list={listId}
				value={draft}
				disabled={value.length >= MAX_LABELS}
				placeholder={value.length ? "" : "Obra, Sarita, Festa…"}
				className="placeholder:text-faint min-w-22.5 flex-1 bg-transparent px-1 text-[13px] outline-none"
				onChange={(e) => {
					const next = e.target.value;
					const inputType = (e.nativeEvent as InputEvent).inputType;
					const picked = !inputType || inputType === "insertReplacementText";
					if (next.endsWith(",")) add(next.slice(0, -1));
					else if (picked && suggestions.includes(next)) add(next);
					else setDraft(next);
				}}
				onKeyDown={(e) => {
					if (e.key === "Enter" && draft.trim()) {
						e.preventDefault();
						add(draft);
					} else if (e.key === "Backspace" && !draft && value.length) {
						onChange(value.slice(0, -1));
					}
				}}
				onBlur={() => add(draft)}
			/>
			<datalist id={listId}>
				{suggestions.map((name) => (
					<option key={name} value={name} />
				))}
			</datalist>
		</div>
	);
}
