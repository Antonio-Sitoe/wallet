import { Dialog } from "@/components/ui/dialog";

export function DetailDialog({
	title,
	children,
	onClose,
}: {
	title: string;
	children: React.ReactNode;
	onClose: () => void;
}) {
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			title={title}
			width={480}
		>
			{children}
		</Dialog>
	);
}
