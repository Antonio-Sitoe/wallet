import { Card } from "@/components/ui/card";

export function ErrorNote({ error }: { error: unknown }) {
	return (
		<Card className="border-danger-line bg-danger-bg text-danger px-4 py-3">
			{error instanceof Error
				? error.message
				: "Não foi possível carregar os dados."}
		</Card>
	);
}
