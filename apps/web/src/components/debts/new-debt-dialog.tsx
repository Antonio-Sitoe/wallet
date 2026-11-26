import type { DebtDirection } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Input } from "@wallet/ui/components/input";
import { useState } from "react";
import { toast } from "sonner";
import { useCreateDebt } from "@/actions/debts/use-create-debt";
import { DIRECTION_LABEL } from "@/components/debts/utils";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Segmented } from "@/components/ui/segmented";
import { moneyInput, parseMoney } from "@/utils/format";

const FORM_ID = "new-debt-form";

export type NewDebtDefaults = {
	person?: string;
	direction?: DebtDirection;
	amount?: number;
	note?: string;
};

export function NewDebtDialog({
	defaults,
	onClose,
	onCreated,
}: {
	defaults?: NewDebtDefaults;
	onClose: () => void;
	onCreated: (id: string) => void;
}) {
	const create = useCreateDebt();
	const [person, setPerson] = useState(defaults?.person ?? "");
	const [direction, setDirection] = useState<DebtDirection>(
		defaults?.direction ?? "owed_to_me",
	);
	const [amount, setAmount] = useState(
		defaults?.amount ? moneyInput(defaults.amount) : "",
	);
	const [note, setNote] = useState(defaults?.note ?? "");
	const cents = parseMoney(amount);
	const canSubmit =
		!!person.trim() && cents !== null && cents > 0 && !create.isPending;

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			title="Nova dívida"
			description="cada pagamento passa a ser uma transacção ligada a esta dívida"
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
						isLoading={create.isPending}
					>
						Criar dívida
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
					const debt = await create.mutateAsync({
						person: person.trim(),
						direction,
						amount: cents,
						note: note.trim() || null,
					});
					toast.success(`Dívida de ${debt.person} criada`);
					onCreated(debt.id);
				}}
			>
				<Segmented
					value={direction}
					onChange={setDirection}
					options={[
						{ value: "owed_to_me", label: DIRECTION_LABEL.owed_to_me },
						{ value: "i_owe", label: DIRECTION_LABEL.i_owe },
					]}
				/>
				<Field label="Pessoa">
					<Input
						value={person}
						onChange={(e) => setPerson(e.target.value)}
						placeholder="Ex.: Edilson"
					/>
				</Field>
				<Field label="Valor (MZN)">
					<MoneyInput
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
					/>
				</Field>
				<Field label="Nota">
					<Input
						value={note}
						onChange={(e) => setNote(e.target.value)}
						placeholder="opcional"
					/>
				</Field>
			</form>
		</Dialog>
	);
}
