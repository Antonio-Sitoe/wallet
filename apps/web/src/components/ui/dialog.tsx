import { Dialog as BaseDialog } from "@base-ui/react/dialog";
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
		<BaseDialog.Root open={open} onOpenChange={onOpenChange}>
			<BaseDialog.Portal>
				<BaseDialog.Backdrop className="fixed inset-0 z-40 bg-[rgba(1,4,9,.66)]" />
				<BaseDialog.Popup
					className="bg-panel text-fg fixed top-[8vh] left-1/2 z-50 flex max-h-[84vh] w-[calc(100vw-32px)] -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-[#30363d] shadow-[0_24px_64px_rgba(1,4,9,.7)] outline-none"
					style={{ maxWidth: width }}
				>
					<div className="border-line flex items-start justify-between gap-3 border-b px-[18px] py-3.5">
						<div className="flex flex-col gap-1">
							<BaseDialog.Title className="text-[15px] font-semibold">
								{title}
							</BaseDialog.Title>
							{description ? (
								<BaseDialog.Description className="num text-dim text-[11px]">
									{description}
								</BaseDialog.Description>
							) : null}
						</div>
						<BaseDialog.Close
							aria-label="Fechar"
							className="text-dim hover:bg-hover hover:text-fg cursor-pointer rounded-md p-1"
						>
							<XIcon className="size-4" />
						</BaseDialog.Close>
					</div>
					<div className="flex flex-col gap-3.5 overflow-y-auto p-[18px]">
						{children}
					</div>
					{footer ? (
						<div className="border-line bg-panel-2 flex flex-wrap items-center justify-end gap-2 border-t px-[18px] py-3">
							{footer}
						</div>
					) : null}
				</BaseDialog.Popup>
			</BaseDialog.Portal>
		</BaseDialog.Root>
	);
}
