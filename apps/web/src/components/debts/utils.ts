import type { Debt, DebtDirection } from "@wallet/shared";
import type { PillTone } from "@/components/ui/pill";

export const debtLeft = (debt: Debt) => Math.max(0, debt.amount - debt.paid);

export const DIRECTION_LABEL: Record<DebtDirection, string> = {
	owed_to_me: "Devem-me",
	i_owe: "Devo",
};

export const receiving = (debt: Pick<Debt, "direction">) =>
	debt.direction === "owed_to_me";

export function debtState(debt: Debt): { label: string; tone: PillTone } {
	if (debt.archived) return { label: "arquivada", tone: "neutral" };
	if (debtLeft(debt) === 0)
		return { label: receiving(debt) ? "recebido" : "pago", tone: "ok" };
	if (debt.paid > 0) return { label: "parcial", tone: "info" };
	return {
		label: receiving(debt) ? "por receber" : "por pagar",
		tone: "warn",
	};
}
