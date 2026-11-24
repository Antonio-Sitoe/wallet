import type * as React from "react";
import { Card } from "@/components/ui/card";

export function StatRow({ children }: { children: React.ReactNode }) {
	return (
		<Card className="divide-line [&>*+*]:border-line grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] overflow-hidden [&>*+*]:border-l">
			{children}
		</Card>
	);
}
