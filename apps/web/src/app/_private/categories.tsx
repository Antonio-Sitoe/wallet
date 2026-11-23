import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CategoriesPage } from "@/components/categories/categories-page";

export const Route = createFileRoute("/_private/categories")({
	validateSearch: z.object({ id: z.string().optional() }),
	component: CategoriesPage,
});
