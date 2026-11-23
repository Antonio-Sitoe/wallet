import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Dashboard } from "@/components/dashboard/dashboard";

export const Route = createFileRoute("/_private/dashboard")({
	validateSearch: z.object({
		period: z.enum(["month", "30d", "year"]).optional(),
		from: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/)
			.optional(),
	}),
	component: Dashboard,
});
