import { ACCOUNT_TYPES, type AccountType } from "@wallet/shared";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card-header";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { TextInput } from "@/components/ui/text-input";
import { useCreateAccount } from "@/lib/queries";
import { ACCOUNT_TYPE_LABEL, parseMoney } from "@/utils/format";

export const COLORS = [
	"#3FB950",
	"#58A6FF",
	"#F0883E",
	"#A371F7",
	"#39C5BB",
	"#D29922",
	"#F778BA",
	"#8B949E",
];

export function NewAccountForm({ onDone }: { onDone: (id?: string) => void }) {
	const create = useCreateAccount();
	const [name, setName] = useState("");
	const [type, setType] = useState<AccountType>("bank");
	const [initial, setInitial] = useState("");
	const [color, setColor] = useState(COLORS[0]!);
	const cents = initial === "" ? 0 : parseMoney(initial);

	return (
		<Card>
			<CardHeader
				title="Nova conta"
				meta="o saldo inicial pode ficar a 0 e ser acertado depois"
			/>
			<form
				className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end"
				onSubmit={async (e) => {
					e.preventDefault();
					if (!name.trim() || cents === null) return;
					const account = await create.mutateAsync({
						name: name.trim(),
						type,
						initialBalance: cents,
						color,
					});
					toast.success(`Conta ${account.name} criada`);
					onDone(account.id);
				}}
			>
				<Field label="Nome">
					<TextInput
						autoFocus
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Ex.: M-Pesa"
					/>
				</Field>
				<Field label="Tipo">
					<Select
						value={type}
						onChange={(e) => setType(e.target.value as AccountType)}
					>
						{ACCOUNT_TYPES.map((t) => (
							<option key={t} value={t}>
								{ACCOUNT_TYPE_LABEL[t]}
							</option>
						))}
					</Select>
				</Field>
				<Field label="Saldo inicial (MZN)">
					<MoneyInput
						value={initial}
						onChange={(e) => setInitial(e.target.value)}
						placeholder="0"
					/>
				</Field>
				<div className="flex gap-2">
					<Button onClick={() => onDone()}>Cancelar</Button>
					<Button
						type="submit"
						variant="primary"
						disabled={!name.trim() || cents === null || create.isPending}
					>
						Criar
					</Button>
				</div>
				<fieldset className="flex flex-wrap gap-1.5 border-0 p-0 sm:col-span-4">
					<legend className="sr-only">Cor</legend>
					{COLORS.map((c) => (
						<button
							key={c}
							type="button"
							aria-pressed={c === color}
							aria-label={c}
							onClick={() => setColor(c)}
							className="size-6 cursor-pointer rounded-md"
							style={{
								background: c,
								outline: c === color ? "2px solid #E6E8EB" : "none",
								outlineOffset: 2,
							}}
						/>
					))}
				</fieldset>
			</form>
		</Card>
	);
}
