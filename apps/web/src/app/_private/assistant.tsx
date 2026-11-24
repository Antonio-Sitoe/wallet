import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AssistantPage } from "@/components/assistant/assistant-page";

export const Route = createFileRoute("/_private/assistant")({
	validateSearch: z.object({ id: z.string().optional() }),
	component: AssistantPage,
});
