import { Pill } from "@/components/ui/pill";
import { STATUS_LABEL } from "@/utils/format";

export const statusTone = {
	unpaid: "neutral",
	partial: "info",
	paid: "ok",
	over: "warn",
} as const;

export const StatusPill = ({ status }: { status: keyof typeof statusTone }) => (
	<Pill tone={statusTone[status]}>{STATUS_LABEL[status]}</Pill>
);
