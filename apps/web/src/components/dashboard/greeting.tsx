import { authClient } from "@/lib/auth-client";

export function greeting() {
	const h = new Date().getHours();
	return h >= 5 && h < 12
		? "Bom dia"
		: h >= 12 && h < 19
			? "Boa tarde"
			: "Boa noite";
}

export function Greeting({ meta }: { meta: string }) {
	const name = authClient.useSession().data?.user.name;
	return (
		<div className="flex flex-col gap-1">
			<h1 className="text-[26px] font-semibold tracking-[-.01em]">
				{greeting()}
				{name ? `, ${name.split(" ")[0]}` : ""}
			</h1>
			<div className="num text-dim text-xs">{meta}</div>
		</div>
	);
}
