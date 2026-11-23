import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PlanPage } from "@/components/plan/plan-page";

export const Route = createFileRoute("/_private/plan")({
	validateSearch: z.object({
		year: z.number().int().min(2000).max(2100).optional(),
	}),
	component: PlanPage,
});
