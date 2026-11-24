import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { ConnectionError } from "@/components/feedback/connection-error";
import { Loader } from "@/components/feedback/loader";
import { NotFound } from "@/components/feedback/not-found";
import { routeTree } from "@/routeTree.gen";

export const getRouter = () => {
	const router = createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreloadStaleTime: 0,
		context: {},
		defaultPendingComponent: () => <Loader />,
		defaultErrorComponent: ConnectionError,
		defaultNotFoundComponent: NotFound,
	});

	return router;
};

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
