import { toCents } from "@wallet/shared";

import type { Sheet } from "./imports.salary-sheet";

export type EmergencyGoal = { name: string; saved: number; target: number };
export type EmergencyPart = { name: string; paid: number; missing: number };
export type EmergencySheet = {
	emergencySaved: number | null;
	goals: EmergencyGoal[];
	parts: EmergencyPart[];
};

const COLUMNS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const normalize = (text: string) =>
	text.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

const columnBefore = (column: string) =>
	COLUMNS[COLUMNS.indexOf(column) - 1] ?? null;

const amountOf = (value: string | undefined) => {
	if (!value?.trim()) return null;
	try {
		return toCents(value);
	} catch {
		return null;
	}
};

const sortedRows = (sheet: Sheet) =>
	[...sheet.rows.keys()].sort((a, b) => a - b);

function findHeader(sheet: Sheet, wanted: string[]) {
	for (const row of sortedRows(sheet)) {
		const cells = sheet.rows.get(row)!;
		const columns = new Map<string, string>();
		for (const [column, cell] of cells)
			columns.set(normalize(cell.value), column);
		if (wanted.every((w) => columns.has(w)))
			return {
				row,
				columns: Object.fromEntries(wanted.map((w) => [w, columns.get(w)!])),
			};
	}
	return null;
}

function emergencySaved(sheet: Sheet) {
	for (const row of sortedRows(sheet)) {
		for (const [column, cell] of sheet.rows.get(row)!) {
			if (!/saldo.*emerg/.test(normalize(cell.value))) continue;
			let last: number | null = null;
			for (const below of sortedRows(sheet).filter((r) => r > row)) {
				const amount = amountOf(sheet.rows.get(below)!.get(column)?.value);
				if (amount !== null) last = amount;
			}
			return last;
		}
	}
	return null;
}

export function parseEmergencySheet(sheet: Sheet): EmergencySheet {
	const goalsHeader = findHeader(sheet, ["atual", "total"]);
	const partsHeader = findHeader(sheet, ["pago", "falta"]);

	const goals: EmergencyGoal[] = [];
	if (goalsHeader) {
		const headerCells = sheet.rows.get(goalsHeader.row)!;
		const firstHeader = [...headerCells.entries()]
			.filter(([, cell]) =>
				["levei", "atual", "total"].includes(normalize(cell.value)),
			)
			.map(([column]) => column)
			.sort((a, b) => COLUMNS.indexOf(a) - COLUMNS.indexOf(b))[0]!;
		const nameCol = columnBefore(firstHeader);
		for (const row of sortedRows(sheet).filter((r) => r > goalsHeader.row)) {
			const cells = sheet.rows.get(row)!;
			const name = nameCol ? cells.get(nameCol)?.value.trim() : undefined;
			const saved = amountOf(cells.get(goalsHeader.columns.atual!)?.value);
			const target = amountOf(cells.get(goalsHeader.columns.total!)?.value);
			if (name && target !== null && target > 0)
				goals.push({ name, saved: saved ?? 0, target });
		}
	}

	const parts: EmergencyPart[] = [];
	if (partsHeader) {
		const nameCol = columnBefore(partsHeader.columns.pago!);
		const lastRow = goalsHeader ? goalsHeader.row : Number.POSITIVE_INFINITY;
		for (const row of sortedRows(sheet).filter(
			(r) => r > partsHeader.row && r < lastRow,
		)) {
			const cells = sheet.rows.get(row)!;
			const name = nameCol ? cells.get(nameCol)?.value.trim() : undefined;
			const paid = amountOf(cells.get(partsHeader.columns.pago!)?.value) ?? 0;
			const missing =
				amountOf(cells.get(partsHeader.columns.falta!)?.value) ?? 0;
			if (name && paid + missing > 0) parts.push({ name, paid, missing });
		}
	}

	return { emergencySaved: emergencySaved(sheet), goals, parts };
}
