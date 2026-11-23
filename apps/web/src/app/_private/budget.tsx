import { createFileRoute } from "@tanstack/react-router";
import { isYearMonth } from "@wallet/shared";
import { z } from "zod";
import { BudgetPage } from "@/components/budgets/budget-page";

export const Route = createFileRoute("/_private/budget")({
	validateSearch: z.object({
		month: z.string().refine(isYearMonth).optional(),
	}),
	component: BudgetPage,
});
