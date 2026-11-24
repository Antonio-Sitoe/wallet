import { Alert, AlertDescription } from "@wallet/ui/components/alert";

export function ErrorNote({ error }: { error: unknown }) {
	return (
		<Alert
			variant="destructive"
			className="border-danger-line bg-danger-bg rounded-card px-4 py-3"
		>
			<AlertDescription className="text-danger text-[13px]">
				{error instanceof Error
					? error.message
					: "Não foi possível carregar os dados."}
			</AlertDescription>
		</Alert>
	);
}
