import type { AssistantMessage } from "@wallet/shared";
import { cn } from "@wallet/ui/lib/utils";
import { SparklesIcon } from "lucide-react";
import { Link } from "react-router";
import { signedMoney } from "@/utils/format";

export const SUGGESTIONS = [
	"Quanto gastei em transporte este mês?",
	"Quanto falta pagar este mês?",
	"Posso gastar 5 000 num presente?",
	"Porque é que uma conta está negativa?",
];

export function AiMark({ size = "md" }: { size?: "md" | "lg" }) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				"bg-ai-bg border-ai-line flex shrink-0 items-center justify-center border",
				size === "lg" ? "size-11 rounded-xl" : "size-7 rounded-lg",
			)}
		>
			<SparklesIcon
				className={cn("text-ai", size === "lg" ? "size-5" : "size-3.5")}
				fill="currentColor"
			/>
		</span>
	);
}

function Thinking() {
	return (
		<div
			className="flex items-center gap-1"
			role="status"
			aria-label="A pensar"
		>
			{[0, 1, 2].map((i) => (
				<span
					key={i}
					className="bg-ai size-1.5 animate-pulse rounded-full"
					style={{ animationDelay: `${i * 0.2}s` }}
				/>
			))}
		</div>
	);
}

function Answer({ message }: { message: AssistantMessage }) {
	const rows = message.data?.rows ?? [];
	const actions = message.data?.actions ?? [];
	return (
		<div className="flex flex-col gap-2.5">
			<p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
			{rows.length ? (
				<div className="border-line bg-canvas overflow-hidden rounded-[10px] border">
					{rows.map((row) => (
						<div
							key={row.label}
							className="border-hover flex items-center gap-2.5 border-b px-3 py-2 last:border-b-0"
						>
							<span
								aria-hidden="true"
								className="size-2 rounded-[2px]"
								style={{ background: row.color ?? "var(--color-dim)" }}
							/>
							<span className="flex-1">{row.label}</span>
							<span
								className={cn(
									"num text-xs",
									row.value < 0 ? "text-warn" : "text-fg",
								)}
							>
								{signedMoney(row.value)}
							</span>
						</div>
					))}
				</div>
			) : null}
			<div className="flex flex-wrap items-center gap-1.5">
				{actions.map((a) => (
					<Link
						key={a.href}
						to={a.href}
						className="border-line-strong bg-hover hover:bg-surface-raised rounded-control inline-flex h-7 items-center border px-2.5 text-xs"
					>
						{a.label} →
					</Link>
				))}
				{message.data?.source ? (
					<span className="num text-dim text-[11px]">
						fonte: {message.data.source}
					</span>
				) : null}
			</div>
		</div>
	);
}

export function ChatMessages({
	messages,
	pending,
}: {
	messages: AssistantMessage[];
	pending: string | null;
}) {
	const shown: { key: string; user?: string; answer?: AssistantMessage }[] =
		messages.map((m) =>
			m.role === "user"
				? { key: m.id, user: m.content }
				: { key: m.id, answer: m },
		);
	if (pending) shown.push({ key: "pending", user: pending });

	return (
		<>
			{shown.map((m) =>
				m.user !== undefined ? (
					<div
						key={m.key}
						className="bg-bubble max-w-[78%] self-end rounded-[14px_14px_4px_14px] px-3.5 py-2.5 leading-relaxed whitespace-pre-wrap"
					>
						{m.user}
					</div>
				) : m.answer ? (
					<div key={m.key} className="flex max-w-[92%] items-start gap-3">
						<AiMark />
						<div className="min-w-0 flex-1 pt-1">
							<Answer message={m.answer} />
						</div>
					</div>
				) : null,
			)}
			{pending ? (
				<div className="flex items-start gap-3">
					<AiMark />
					<div className="pt-2.5">
						<Thinking />
					</div>
				</div>
			) : null}
		</>
	);
}
