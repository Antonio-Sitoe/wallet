import { Button } from "@wallet/ui/components/button";
import {
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	Dialog as DialogRoot,
	DialogTitle,
} from "@wallet/ui/components/dialog";
import {
	Sheet,
	SheetBody,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetTitle,
} from "@wallet/ui/components/sheet";
import { XIcon } from "lucide-react";
import type * as React from "react";
import { useIsMobile } from "@/hooks/use-is-mobile";

type DialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: React.ReactNode;
	description?: React.ReactNode;
	children: React.ReactNode;
	footer?: React.ReactNode;
	width?: number;
};

export function Dialog(props: DialogProps) {
	const isMobile = useIsMobile();
	return isMobile ? <MobileDialog {...props} /> : <DesktopDialog {...props} />;
}

function MobileDialog({
	open,
	onOpenChange,
	title,
	description,
	children,
	footer,
}: DialogProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="bg-panel text-fg border-line-overlay border-t text-[15px]">
				<div className="flex items-start justify-between gap-3 px-4 pt-2 pb-3">
					<div className="flex min-w-0 flex-col gap-1 pt-2.5">
						<SheetTitle className="text-fg">{title}</SheetTitle>
						{description ? (
							<SheetDescription className="num text-dim text-xs">
								{description}
							</SheetDescription>
						) : null}
					</div>
					<SheetClose
						render={
							<Button
								variant="quiet"
								aria-label="Fechar"
								className="text-fg-2 -mr-2 size-11 shrink-0 rounded-full"
							/>
						}
					>
						<XIcon className="size-5" />
					</SheetClose>
				</div>
				<SheetBody className="flex flex-col gap-4 px-4 pb-4">{children}</SheetBody>
				{footer ? (
					<div className="border-line bg-panel-2 flex flex-col-reverse gap-2 border-t px-4 pt-3 pb-3 *:min-h-12 *:w-full *:justify-center *:text-[15px]">
						{footer}
					</div>
				) : null}
			</SheetContent>
		</Sheet>
	);
}

function DesktopDialog({
	open,
	onOpenChange,
	title,
	description,
	children,
	footer,
	width = 560,
}: DialogProps) {
	return (
		<DialogRoot open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="bg-panel text-fg border-line-overlay shadow-overlay flex max-h-[84vh] w-[calc(100vw-32px)] max-w-none flex-col gap-0 overflow-hidden border p-0 text-[13px] ring-0 sm:max-w-none"
				style={{ maxWidth: width }}
			>
				<DialogHeader className="border-line flex-row items-start justify-between gap-3 border-b px-[18px] py-3.5">
					<div className="flex flex-col gap-1">
						<DialogTitle className="text-fg text-[15px] font-semibold">
							{title}
						</DialogTitle>
						{description ? (
							<DialogDescription className="num text-dim text-[11px]">
								{description}
							</DialogDescription>
						) : null}
					</div>
					<DialogClose
						render={
							<Button variant="quiet" size="icon-sm" aria-label="Fechar" />
						}
					>
						<XIcon className="size-4" />
					</DialogClose>
				</DialogHeader>
				<div className="flex flex-col gap-3.5 overflow-y-auto p-[18px]">
					{children}
				</div>
				{footer ? (
					<DialogFooter className="border-line bg-panel-2 m-0 flex-row flex-wrap items-center justify-end gap-2 rounded-none border-t px-[18px] py-3">
						{footer}
					</DialogFooter>
				) : null}
			</DialogContent>
		</DialogRoot>
	);
}
