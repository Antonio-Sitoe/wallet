import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import { ConnectionError } from "./components/connection-error";
import Loader from "./components/loader";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
	const router = createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreloadStaleTime: 0,
		context: {},
		defaultPendingComponent: () => <Loader />,
		defaultErrorComponent: ConnectionError,
		defaultNotFoundComponent: () => <div>Not Found</div>,
	});

	return router;
};

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
