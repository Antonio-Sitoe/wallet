import { createContext, useContext } from "react";

export type ConfirmRequest = {
	title: string;
	description?: string;
	confirmLabel?: string;
	destructive?: boolean;
};

export const ConfirmContext = createContext<
	(request: ConfirmRequest) => Promise<boolean>
>(async () => false);

export const useConfirm = () => useContext(ConfirmContext);
