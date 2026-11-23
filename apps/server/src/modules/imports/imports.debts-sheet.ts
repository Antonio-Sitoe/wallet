import { toCents } from "@wallet/shared";

import type { Sheet } from "./imports.salary-sheet";

export type SheetDebtRow = {
	person: string;
	direction: "owed_to_me" | "i_owe";
	amount: number;
};

const COLUMNS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const normalize = (text: string) =>
	text.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

const columnAfter = (column: string) =>
	COLUMNS[COLUMNS.indexOf(column) + 1] ?? null;

const amountOf = (value: string | undefined) => {
	if (!value?.trim()) return null;
	try {
		return toCents(value);
	} catch {
		return null;
	}
};

export function parseDebtsSheet(sheet: Sheet): SheetDebtRow[] {
	const rows = [...sheet.rows.keys()].sort((a, b) => a - b);
	for (const headerRow of rows) {
		const cells = sheet.rows.get(headerRow)!;
		const lists: { name: string; direction: SheetDebtRow["direction"] }[] = [];
		for (const [column, cell] of cells) {
			const text = normalize(cell.value);
			if (text === "nomes" || text === "devem-me" || text === "a receber")
				lists.push({ name: column, direction: "owed_to_me" });
			else if (/dever|devo|a pagar/.test(text))
				lists.push({ name: column, direction: "i_owe" });
		}
		if (lists.length === 0) continue;

		const debts: SheetDebtRow[] = [];
		for (const list of lists) {
			const amountColumn = columnAfter(list.name);
			if (!amountColumn) continue;
			for (const row of rows.filter((r) => r > headerRow)) {
				const line = sheet.rows.get(row)!;
				const person = line.get(list.name)?.value.trim();
				const amount = amountOf(line.get(amountColumn)?.value);
				if (!person || normalize(person) === "total") continue;
				if (amount !== null && amount > 0)
					debts.push({ person, direction: list.direction, amount });
			}
		}
		return debts;
	}
	return [];
}
