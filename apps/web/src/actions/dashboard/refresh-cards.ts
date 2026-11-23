import type { QueryClient } from "@tanstack/react-query";

export const refreshCards = (qc: QueryClient) =>
	qc.invalidateQueries({ queryKey: ["dashboard-cards"] });
