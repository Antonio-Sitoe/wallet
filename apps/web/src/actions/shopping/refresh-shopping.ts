import type { QueryClient } from "@tanstack/react-query";

export const refreshShopping = (qc: QueryClient) =>
	qc.invalidateQueries({ queryKey: ["shopping"] });
