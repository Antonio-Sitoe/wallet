import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";

export const useDeleteProfile = () =>
	useMutation({
		mutationFn: (email: string) =>
			api<void>("/settings/profile", { method: "DELETE", body: { email } }),
		onError: (error) => toast.error(errorMessage(error)),
	});
