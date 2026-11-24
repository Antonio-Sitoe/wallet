import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ShoppingPage } from "@/components/shopping/shopping-page";

export const Route = createFileRoute("/_private/shopping")({
	validateSearch: z.object({
		id: z.string().optional(),
		archived: z.boolean().optional(),
	}),
	component: ShoppingPage,
});
