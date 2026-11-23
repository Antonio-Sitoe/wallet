import { addMonths, type Goal } from "@wallet/shared";
import type { PillTone } from "@/components/ui/pill";
import { currentMonth, MONTH_SHORT, money, monthLabel } from "@/utils/format";

export const GOAL_COLORS = [
	"#3FB950",
	"#58A6FF",
	"#F0883E",
	"#A371F7",
	"#39C5BB",
	"#D29922",
	"#F778BA",
] as const;

const SLOW_AFTER_MONTHS = 24;

export const goalLeft = (goal: Goal) => Math.max(0, goal.target - goal.saved);

export const goalPct = (goal: Goal) =>
	Math.min(100, Math.round((goal.saved / goal.target) * 100));

export const goalColor = (goal: Goal, index: number) =>
	goal.color ?? GOAL_COLORS[index % GOAL_COLORS.length]!;

export const monthlyPlanned = (goal: Goal) =>
	goal.plan?.frequency === "monthly" ? goal.plan.amount : 0;

const monthsUntil = (deadline: string) => {
	let count = 0;
	for (let m = currentMonth(); m <= deadline; m = addMonths(m, 1)) count++;
	return count;
};

export type GoalPace = { label: string; tone: PillTone; forecast: string };

export function goalPace(goal: Goal): GoalPace {
	const left = goalLeft(goal);
	if (left === 0)
		return { label: "concluída", tone: "ok", forecast: "meta concluída" };

	const monthly = monthlyPlanned(goal);
	const plan = goal.plan;

	if (plan && plan.frequency !== "monthly") {
		const when = plan.months
			.map((m) => MONTH_SHORT[m - 1])
			.filter(Boolean)
			.join(", ");
		const covers = plan.amount >= left;
		return {
			label: covers ? "no ritmo" : "devagar",
			tone: covers ? "ok" : "warn",
			forecast: covers
				? `o item de ${when} (${money(plan.amount)}) cobre o que falta`
				: `o item de ${when} (${money(plan.amount)}) não chega para o que falta`,
		};
	}

	if (monthly > 0) {
		const months = Math.ceil(left / monthly);
		const forecast = `a ${money(monthly)}/mês: ${months} ${months === 1 ? "mês" : "meses"}`;
		if (goal.deadline) {
			const onTime = months <= monthsUntil(goal.deadline);
			return {
				label: onTime ? "no ritmo" : "atrasada",
				tone: onTime ? "ok" : "warn",
				forecast,
			};
		}
		const slow = months > SLOW_AFTER_MONTHS;
		return {
			label: slow ? "devagar" : "no ritmo",
			tone: slow ? "warn" : "ok",
			forecast,
		};
	}

	if (goal.deadline) {
		const months = monthsUntil(goal.deadline);
		return {
			label: "sem plano",
			tone: "neutral",
			forecast:
				months > 0
					? `até ${monthLabel(goal.deadline)}: ${money(Math.ceil(left / months))}/mês`
					: `o prazo (${monthLabel(goal.deadline)}) já passou`,
		};
	}

	return {
		label: "sem plano",
		tone: "neutral",
		forecast: "sem contribuição planeada",
	};
}
