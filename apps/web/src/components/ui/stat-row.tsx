import type * as React from "react";
import { Card } from "@/components/ui/card";

export function StatRow({ children }: { children: React.ReactNode }) {
	return (
		<Card className="divide-line [&>*+*]:border-line max-md:[&>*]:border-line grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] overflow-hidden max-md:grid-cols-2 max-md:rounded-[18px] [&>*+*]:border-l max-md:[&>*+*]:border-l-0 max-md:[&>*:last-child:nth-child(odd)]:col-span-2 max-md:[&>*:nth-child(even)]:border-l max-md:[&>*:nth-child(n+3)]:border-t">
			{children}
		</Card>
	);
}
