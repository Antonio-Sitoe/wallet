/** Usage: npx tsx scripts/check-sheet.ts <file.xlsx> [year] — prints the months and plan items the sheet import would create. */
import { readFileSync } from "node:fs";

import { formatMZN } from "@wallet/shared";

import {
	parseSalarySheet,
	readXlsx,
	recurringItems,
} from "../src/modules/imports/salary-sheet";

const [path, yearArg] = process.argv.slice(2);
if (!path)
	throw new Error("Usage: tsx scripts/check-sheet.ts <file.xlsx> [year]");
const sheets = readXlsx(new Uint8Array(readFileSync(path)));
console.log("sheets:", sheets.map((s) => s.name).join(", "));
const salary = sheets.find((s) => /salario/i.test(s.name)) ?? sheets[0]!;
const { months, skipped } = parseSalarySheet(salary, Number(yearArg ?? 2026));
for (const m of months) {
	const total = m.items.reduce((s, i) => s + i.amount, 0);
	console.log(
		`${m.month} (${m.label}) ${m.items.length} itens · ${formatMZN(total)}`,
	);
}
console.log("skipped:", skipped);
console.log("plan items:");
for (const p of recurringItems(months))
	console.log(
		`  ${p.name} · ${formatMZN(p.amount)} · meses ${p.months.join(",")} · ${p.rule?.slug ?? "?"}`,
	);
