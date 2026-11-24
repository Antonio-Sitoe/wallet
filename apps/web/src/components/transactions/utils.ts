import { addMonths } from "@/utils/format";

export const PERIODS = {
	"30d": "últimos 30 dias",
	month: "este mês",
	"last-month": "mês anterior",
	year: "este ano",
	all: "tudo",
} as const;

export type Period = keyof typeof PERIODS;

export function monthChoices(around: string) {
	return [-3, -2, -1, 0, 1, 2].map((d) => addMonths(around, d));
}
