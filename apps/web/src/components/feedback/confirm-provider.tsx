import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@wallet/ui/components/alert-dialog";
import { type ReactNode, useCallback, useRef, useState } from "react";
import {
	ConfirmContext,
	type ConfirmRequest,
} from "@/contexts/confirm-context";

export function ConfirmProvider({ children }: { children: ReactNode }) {
	const [request, setRequest] = useState<ConfirmRequest | null>(null);
	const resolveRef = useRef<((answer: boolean) => void) | null>(null);

	const confirm = useCallback(
		(next: ConfirmRequest) =>
			new Promise<boolean>((resolve) => {
				resolveRef.current?.(false);
				resolveRef.current = resolve;
				setRequest(next);
			}),
		[],
	);

	const answer = (value: boolean) => {
		resolveRef.current?.(value);
		resolveRef.current = null;
		setRequest(null);
	};

	return (
		<ConfirmContext.Provider value={confirm}>
			{children}
			<AlertDialog
				open={request !== null}
				onOpenChange={(open) => {
					if (!open) answer(false);
				}}
			>
				<AlertDialogContent className="bg-panel text-fg border-line-overlay border text-[13px] ring-0">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-fg text-[15px] font-semibold">
							{request?.title}
						</AlertDialogTitle>
						{request?.description ? (
							<AlertDialogDescription className="text-fg-2 text-[13px]">
								{request.description}
							</AlertDialogDescription>
						) : null}
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel variant="neutral">Cancelar</AlertDialogCancel>
						<AlertDialogAction
							variant={request?.destructive === false ? "primary" : "danger"}
							onClick={() => answer(true)}
						>
							{request?.confirmLabel ?? "Confirmar"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</ConfirmContext.Provider>
	);
}
