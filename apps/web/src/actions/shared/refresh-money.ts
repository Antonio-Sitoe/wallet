import type { QueryClient } from "@tanstack/react-query";

export function refreshMoney(qc: QueryClient) {
	for (const key of [
		"accounts",
		"transactions",
		"transaction",
		"transfer",
		"budget-month",
		"plan",
		"categories",
		"month-item",
		"analytics",
		"imports",
		"goals",
		"goal",
		"debts",
		"debt",
		"debt-suggestions",
	]) {
		qc.invalidateQueries({ queryKey: [key] });
	}
}
