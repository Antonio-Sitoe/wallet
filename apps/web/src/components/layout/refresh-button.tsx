import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { Button } from "@wallet/ui/components/button";
import { RefreshCwIcon } from "lucide-react";
import { useState } from "react";
import { useOnline } from "@/lib/connection";

export function RefreshButton({ className }: { className?: string }) {
	const queryClient = useQueryClient();
	const online = useOnline();
	const fetching = useIsFetching() > 0;
	const [busy, setBusy] = useState(false);

	const refresh = async () => {
		setBusy(true);
		try {
			await queryClient.invalidateQueries();
		} finally {
			setBusy(false);
		}
	};

	return (
		<Button
			variant="quiet"
			size="icon-sm"
			aria-label="Actualizar dados"
			title="Actualizar dados"
			disabled={!online || busy}
			className={className}
			onClick={() => void refresh()}
		>
			<RefreshCwIcon
				className={`size-4 ${busy || fetching ? "animate-spin" : ""}`}
				strokeWidth={1.8}
			/>
		</Button>
	);
}
