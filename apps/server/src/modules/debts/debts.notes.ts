import type { DebtDirection, DebtSuggestion } from "./debts.schema";
import type { LoanNoteRow } from "./debts.types";

const MIN_NOTES = 2;
const SELF = new Set(["eu", "me"]);

export const personKey = (name: string) =>
	name
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");

export const firstName = (name: string) => personKey(name).split(" ")[0] ?? "";

export function parseLoanNote(
	note: string,
): { person: string; toMe: boolean } | null {
	const match = note.match(/^\s*(.+?)\s*(?:→|->)\s*(.+?)\s*(?::.*)?$/);
	if (!match) return null;
	const from = match[1]!.trim();
	const to = match[2]!.split(":")[0]!.trim();
	if (SELF.has(personKey(to)) && !SELF.has(personKey(from)))
		return { person: from, toMe: true };
	if (SELF.has(personKey(from)) && !SELF.has(personKey(to)))
		return { person: to, toMe: false };
	return null;
}

export function loanSuggestions(rows: LoanNoteRow[]): DebtSuggestion[] {
	const people = new Map<string, Omit<DebtSuggestion, "direction" | "net">>();
	for (const row of rows) {
		if (row.type !== "income" && row.type !== "expense") continue;
		const parsed = row.note ? parseLoanNote(row.note) : null;
		if (!parsed) continue;
		const key = personKey(parsed.person);
		const entry = people.get(key) ?? {
			key,
			person: parsed.person,
			outCount: 0,
			outTotal: 0,
			inCount: 0,
			inTotal: 0,
		};
		const amount = Math.abs(row.amount);
		if (parsed.toMe) {
			entry.inCount++;
			entry.inTotal += amount;
		} else {
			entry.outCount++;
			entry.outTotal += amount;
		}
		people.set(key, entry);
	}
	return [...people.values()]
		.map((p) => {
			const balance = p.outTotal - p.inTotal;
			const direction: DebtDirection = balance >= 0 ? "owed_to_me" : "i_owe";
			return { ...p, direction, net: Math.abs(balance) };
		})
		.filter((s) => s.net > 0 && s.inCount + s.outCount >= MIN_NOTES)
		.sort((a, b) => b.net - a.net);
}
