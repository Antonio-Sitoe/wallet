import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function DetailCard({
	title,
	children,
	onClose,
}: {
	title: string;
	children: React.ReactNode;
	onClose: () => void;
}) {
	return (
		<Card className="sticky top-4 min-w-0 flex-[2_1_340px] overflow-hidden">
			<div className="border-line flex items-center justify-between border-b px-4 py-3">
				<h2 className="text-sm font-semibold">{title}</h2>
				<Button size="sm" onClick={onClose}>
					esc
				</Button>
			</div>
			<div className="flex flex-col gap-3 p-4">{children}</div>
		</Card>
	);
}
