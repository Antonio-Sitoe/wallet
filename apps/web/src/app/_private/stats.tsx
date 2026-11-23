import { createFileRoute } from "@tanstack/react-router";
import { BREAKDOWN_DIMENSIONS, MONEY_FLOWS } from "@wallet/shared";
import { z } from "zod";
import { StatsPage } from "@/components/stats/stats-page";

export const Route = createFileRoute("/_private/stats")({
	validateSearch: z.object({
		period: z.enum(["month", "30d", "year"]).optional(),
		from: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/)
			.optional(),
		by: z.enum(BREAKDOWN_DIMENSIONS).optional(),
		flow: z.enum(MONEY_FLOWS).optional(),
	}),
	component: StatsPage,
});
