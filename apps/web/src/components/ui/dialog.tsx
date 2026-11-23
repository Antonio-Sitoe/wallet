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
import { XIcon } from "lucide-react";
import type * as React from "react";

export function Dialog({
	open,
	onOpenChange,
	title,
	description,
	children,
	footer,
	width = 560,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: React.ReactNode;
	description?: React.ReactNode;
	children: React.ReactNode;
	footer?: React.ReactNode;
	width?: number;
}) {
	return (
		<DialogRoot open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="bg-panel text-fg flex max-h-[84vh] w-[calc(100vw-32px)] max-w-none flex-col gap-0 overflow-hidden border border-[#30363d] p-0 text-[13px] shadow-[0_24px_64px_rgba(1,4,9,.7)] ring-0 sm:max-w-none"
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
