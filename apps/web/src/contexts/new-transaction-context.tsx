import { createContext, useContext } from "react";
import type { NewTransactionDefaults } from "@/components/transactions/new-transaction-dialog";

export const NewTransactionContext = createContext<
	(defaults?: NewTransactionDefaults) => void
>(() => {});

export const useNewTransaction = () => useContext(NewTransactionContext);
