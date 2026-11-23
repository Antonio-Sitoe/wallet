import { createFileRoute } from "@tanstack/react-router";
import { DEBT_DIRECTIONS } from "@wallet/shared";
import { z } from "zod";
import { DebtsPage } from "@/components/debts/debts-page";

export const Route = createFileRoute("/_private/debts")({
	validateSearch: z.object({
		id: z.string().optional(),
		tab: z.enum(DEBT_DIRECTIONS).optional(),
		archived: z.boolean().optional(),
	}),
	component: DebtsPage,
});
