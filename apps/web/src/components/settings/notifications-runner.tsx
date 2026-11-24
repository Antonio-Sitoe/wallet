import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { AppNotice } from "@wallet/shared";
import { useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { markSeen, readSeen, showNotification } from "@/lib/notify";
import { todayInput } from "@/utils/format";

const CHECK_EVERY = 15 * 60_000;
const AT_ONCE = 4;

export function useNotices() {
	return useQuery({
		queryKey: ["notifications", todayInput()],
		queryFn: () =>
			api<AppNotice[]>("/notifications", { query: { today: todayInput() } }),
		refetchInterval: CHECK_EVERY,
		refetchIntervalInBackground: true,
		staleTime: 60_000,
	});
}

export function NotificationsRunner() {
	const navigate = useNavigate();
	const notices = useNotices().data;

	useEffect(() => {
		if (!notices?.length) return;
		const seen = new Set(readSeen());
		const fresh = notices.filter((n) => !seen.has(n.key));
		if (!fresh.length) return;
		markSeen(fresh.map((n) => n.key));
		const open = (href: string) => () => navigate({ href });
		void (async () => {
			for (const notice of fresh.slice(0, AT_ONCE)) {
				const sent = await showNotification(
					notice.title,
					notice.body,
					open(notice.href),
				);
				if (!sent)
					toast(notice.title, {
						description: notice.body,
						duration: 12_000,
						action: { label: "Abrir", onClick: open(notice.href) },
					});
			}
			const rest = fresh.length - AT_ONCE;
			if (rest > 0)
				toast(`Mais ${rest} ${rest === 1 ? "aviso" : "avisos"} hoje`, {
					description: "Veja os pagamentos, a lista do mês e as dívidas.",
				});
		})();
	}, [notices, navigate]);

	return null;
}
