import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AccountsPage } from "@/components/accounts/accounts-page";

export const Route = createFileRoute("/_private/accounts")({
	validateSearch: z.object({
		id: z.string().optional(),
		archived: z.boolean().optional(),
		validate: z.boolean().optional(),
		create: z.boolean().optional(),
	}),
	component: AccountsPage,
});
