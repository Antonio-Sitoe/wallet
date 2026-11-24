import type { DashboardCardType } from "@wallet/shared";
import type { Period } from "@/@types/period";

export const CARD_CATALOG: Record<
	DashboardCardType,
	{ title: string; description: string; section: string }
> = {
	summary: {
		title: "Resumo",
		description:
			"Saldo total, entradas, saídas e o que falta gastar na lista do mês",
		section: "Geral",
	},
	"cash-flow": {
		title: "Fluxo de caixa",
		description: "Entradas contra saídas no período, comparado com o anterior",
		section: "Fluxo de caixa",
	},
	"cash-flow-trend": {
		title: "Entradas e saídas",
		description: "Barras por dia, semana ou mês (ou o ano inteiro)",
		section: "Fluxo de caixa",
	},
	"period-comparison": {
		title: "Comparação de períodos",
		description: "Fluxo acumulado deste período, do anterior e de há um ano",
		section: "Fluxo de caixa",
	},
	"balance-trend": {
		title: "Evolução do saldo",
		description: "Saldo total de todas as contas, dia a dia",
		section: "Saldo",
	},
	"spending-by-category": {
		title: "Onde vai o dinheiro",
		description: "Saídas por categoria principal no período",
		section: "Gastos",
	},
	accounts: {
		title: "Contas",
		description: "Saldo de cada conta",
		section: "Geral",
	},
	upcoming: {
		title: "Próximos por pagar",
		description: "Itens da lista do mês ainda por pagar",
		section: "Orçamento",
	},
	"last-records": {
		title: "Últimas transacções",
		description: "Os registos mais recentes",
		section: "Geral",
	},
	"pie-categories": {
		title: "Gastos por categoria",
		description: "Donut das saídas (ou entradas) por categoria principal",
		section: "Gráficos circulares",
	},
	"pie-accounts": {
		title: "Gastos por conta",
		description: "Donut das saídas (ou entradas) por conta",
		section: "Gráficos circulares",
	},
	"pie-cash-flow": {
		title: "Entradas e saídas",
		description: "Donut com entradas contra saídas e o que sobrou",
		section: "Gráficos circulares",
	},
};

const INCOME_TITLE: Partial<Record<DashboardCardType, string>> = {
	"pie-categories": "Entradas por categoria",
	"pie-accounts": "Entradas por conta",
};

export const HAS_RANGE_TOGGLE: DashboardCardType[] = [
	"cash-flow-trend",
	"spending-by-category",
	"pie-categories",
	"pie-accounts",
	"pie-cash-flow",
];

export const HAS_FLOW_TOGGLE: DashboardCardType[] = [
	"pie-categories",
	"pie-accounts",
];

export function cardTitle(
	type: DashboardCardType,
	period: Period,
	config: Record<string, unknown>,
) {
	const base =
		(config.flow === "income" ? INCOME_TITLE[type] : undefined) ??
		CARD_CATALOG[type].title;
	return config.range === "year" ? `${base} · ${period.to.slice(0, 4)}` : base;
}

export const monthOfPeriod = (p: Period) => p.to.slice(0, 7);
