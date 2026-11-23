export function IconButton({
	label,
	children,
	onClick,
	disabled,
	className = "flex",
}: {
	className?: string;
	label: string;
	children: React.ReactNode;
	onClick: () => void;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			title={label}
			disabled={disabled}
			onClick={onClick}
			className={`border-line-strong bg-hover text-fg-2 hover:text-fg ${className} size-7 cursor-pointer items-center justify-center rounded-md border disabled:cursor-not-allowed disabled:opacity-30`}
		>
			{children}
		</button>
	);
}
