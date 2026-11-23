import type {
	OccurrenceStatus,
	PlannedFrequency,
	PlannedOccurrence,
} from "@wallet/shared";
import type { PillTone } from "@/components/ui/pill";

const MONTHS = [
	"jan",
	"fev",
	"mar",
	"abr",
	"mai",
	"jun",
	"jul",
	"ago",
	"set",
	"out",
	"nov",
	"dez",
];

export const FREQUENCY_LABEL: Record<PlannedFrequency, string> = {
	once: "uma vez",
	monthly: "mensal",
	yearly: "anual",
};

export const REMIND_LABEL = (days: number | null) =>
	days === null
		? "sem lembrete"
		: days === 0
			? "no dia, 08:00"
			: `${days} ${days === 1 ? "dia" : "dias"} antes, 08:00`;

export function dayParts(iso: string) {
	const [, m, d] = iso.split("-").map(Number) as [number, number, number];
	return { day: String(d), mon: MONTHS[m - 1] ?? "" };
}

export function dateLabel(iso: string, withYear = true) {
	const [y] = iso.split("-");
	const { day, mon } = dayParts(iso);
	return withYear ? `${day} ${mon} ${y}` : `${day} ${mon}`;
}

export function statusMeta(o: Pick<PlannedOccurrence, "status" | "daysLate">): {
	label: string;
	tone: PillTone;
} {
	const map: Record<OccurrenceStatus, { label: string; tone: PillTone }> = {
		paid: { label: "pago", tone: "ok" },
		skipped: { label: "saltado", tone: "neutral" },
		overdue: {
			label: `atrasado ${o.daysLate} ${o.daysLate === 1 ? "dia" : "dias"}`,
			tone: "danger",
		},
		due: { label: "por pagar", tone: "warn" },
		scheduled: { label: "agendado", tone: "neutral" },
	};
	return map[o.status];
}

export const isOpen = (o: Pick<PlannedOccurrence, "status">) =>
	o.status === "overdue" || o.status === "due" || o.status === "scheduled";

export type GroupKey =
	| "overdue"
	| "due"
	| "month"
	| "later"
	| "paid"
	| "skipped";

export const GROUP_LABEL: Record<GroupKey, string> = {
	overdue: "Atrasados",
	due: "Próximos 7 dias",
	month: "Mais tarde este mês",
	later: "Próximos meses",
	paid: "Pagos",
	skipped: "Saltados",
};

export function groupOf(o: PlannedOccurrence, month: string): GroupKey {
	if (o.status === "scheduled")
		return o.dueDate.startsWith(month) ? "month" : "later";
	return o.status;
}
