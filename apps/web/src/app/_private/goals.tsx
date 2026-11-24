import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { GoalsPage } from "@/components/goals/goals-page";

export const Route = createFileRoute("/_private/goals")({
	validateSearch: z.object({
		id: z.string().optional(),
		archived: z.boolean().optional(),
		tab: z.enum(["active", "done"]).optional(),
	}),
	component: GoalsPage,
});
