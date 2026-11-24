import { Button } from "@wallet/ui/components/button";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { usePreferencesContext } from "@/contexts/preferences-context";

export function HideMoneyButton({
	shortcut,
	iconOnly,
	className,
}: {
	shortcut?: string;
	iconOnly?: boolean;
	className?: string;
}) {
	const { preferences, update } = usePreferencesContext();
	const hidden = preferences?.hideMoney ?? false;
	const Icon = hidden ? EyeOffIcon : EyeIcon;
	const label = hidden ? "Mostrar valores" : "Ocultar valores";

	return (
		<Button
			variant="quiet"
			size={iconOnly ? "icon-sm" : "default"}
			aria-label={iconOnly ? label : undefined}
			aria-pressed={hidden}
			title={shortcut ? `${label} · ${shortcut}` : label}
			disabled={!preferences}
			onClick={() => update({ hideMoney: !hidden })}
			className={className}
		>
			<Icon
				className={hidden ? "text-warn size-4" : "size-4"}
				strokeWidth={1.8}
			/>
			{iconOnly ? null : (
				<>
					<span className="flex-1 text-left">{label}</span>
					{shortcut ? (
						<span className="num text-dim text-[11px]">{shortcut}</span>
					) : null}
				</>
			)}
		</Button>
	);
}
