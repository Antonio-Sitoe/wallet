import type { QueryClient } from "@tanstack/react-query";

export const refreshPlanned = (qc: QueryClient) =>
	qc.invalidateQueries({ queryKey: ["planned"] });
