import { ACCOUNT_TYPES, type AccountType } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Input } from "@wallet/ui/components/input";
import { useState } from "react";
import { toast } from "sonner";
import { useCreateAccount } from "@/actions/accounts/use-create-account";
import {
	ACCOUNT_COLORS,
	ColorSwatches,
} from "@/components/accounts/color-swatches";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { ACCOUNT_TYPE_LABEL, parseMoney } from "@/utils/format";

const FORM_ID = "new-account-form";

export function NewAccountDialog({ onClose }: { onClose: () => void }) {
	const create = useCreateAccount();
	const [name, setName] = useState("");
	const [type, setType] = useState<AccountType>("bank");
	const [initial, setInitial] = useState("");
	const [color, setColor] = useState<string>(ACCOUNT_COLORS[0]);
	const cents = initial === "" ? 0 : parseMoney(initial);
	const canSubmit = !!name.trim() && cents !== null && !create.isPending;

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			title="Nova conta"
			description="o saldo inicial pode ficar a 0 e ser acertado depois"
			width={480}
			footer={
				<>
					<Button variant="neutral" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						type="submit"
						form={FORM_ID}
						variant="primary"
						disabled={!canSubmit}
					>
						Criar conta
					</Button>
				</>
			}
		>
			<form
				id={FORM_ID}
				className="flex flex-col gap-3.5"
				onSubmit={async (e) => {
					e.preventDefault();
					if (!canSubmit || cents === null) return;
					const account = await create.mutateAsync({
						name: name.trim(),
						type,
						initialBalance: cents,
						color,
					});
					toast.success(`Conta ${account.name} criada`);
					onClose();
				}}
			>
				<Field label="Nome">
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Ex.: M-Pesa"
					/>
				</Field>
				<div className="grid grid-cols-2 gap-3">
					<Field label="Tipo">
						<Select
							value={type}
							onValueChange={(value) => setType(value as AccountType)}
							items={[
								...ACCOUNT_TYPES.map((t) => ({
									value: t,
									label: String(ACCOUNT_TYPE_LABEL[t]),
								})),
							]}
						/>
					</Field>
					<Field label="Saldo inicial (MZN)">
						<MoneyInput
							value={initial}
							onChange={(e) => setInitial(e.target.value)}
							placeholder="0"
						/>
					</Field>
				</div>
				<fieldset className="flex flex-col gap-2 border-0 p-0">
					<legend className="text-fg-2 mb-2 text-xs">Cor</legend>
					<ColorSwatches value={color} onChange={setColor} />
				</fieldset>
			</form>
		</Dialog>
	);
}
