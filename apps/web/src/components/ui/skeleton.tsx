import { cn } from "@wallet/ui/lib/utils";

export function Skeleton({ className }: { className?: string }) {
	return <div className={cn("bg-hover animate-pulse rounded-md", className)} />;
}
