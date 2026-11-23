import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ImportPage } from "@/components/imports/import-page";

export const Route = createFileRoute("/_private/import")({
	validateSearch: z.object({
		id: z.string().optional(),
		sheet: z.string().optional(),
	}),
	component: ImportPage,
});
