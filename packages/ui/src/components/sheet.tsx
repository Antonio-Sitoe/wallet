import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { cn } from "cn";
import type * as React from "react";

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
	return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
	return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
	return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetContent({
	className,
	children,
	showHandle = true,
	...props
}: SheetPrimitive.Popup.Props & { showHandle?: boolean }) {
	return (
		<SheetPrimitive.Portal data-slot="sheet-portal">
			<SheetPrimitive.Backdrop
				data-slot="sheet-overlay"
				className="data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 isolate z-50 bg-[rgba(1,4,9,.66)] duration-200"
			/>
			<SheetPrimitive.Popup
				data-slot="sheet-content"
				className={cn(
					"bg-card text-card-foreground data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom fixed inset-x-0 bottom-0 z-50 flex max-h-[92svh] flex-col overflow-hidden rounded-t-[28px] pb-[env(safe-area-inset-bottom)] duration-250 ease-out outline-none",
					className,
				)}
				{...props}
			>
				{showHandle ? (
					<div
						aria-hidden="true"
						className="bg-foreground/25 mx-auto mt-2 h-[5px] w-[38px] shrink-0 rounded-full"
					/>
				) : null}
				{children}
			</SheetPrimitive.Popup>
		</SheetPrimitive.Portal>
	);
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
	return (
		<SheetPrimitive.Title
			data-slot="sheet-title"
			className={cn("text-[17px] font-semibold", className)}
			{...props}
		/>
	);
}

function SheetDescription({
	className,
	...props
}: SheetPrimitive.Description.Props) {
	return (
		<SheetPrimitive.Description
			data-slot="sheet-description"
			className={cn("text-muted-foreground text-xs", className)}
			{...props}
		/>
	);
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-body"
			className={cn(
				"min-h-0 flex-1 overflow-y-auto overscroll-contain *:shrink-0",
				className,
			)}
			{...props}
		/>
	);
}

export {
	Sheet,
	SheetBody,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetTitle,
	SheetTrigger,
};
