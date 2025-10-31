"use client";

import { useEffect } from "react";

export function DevUnhandledRejectionLogger() {
	useEffect(() => {
		if (process.env.NODE_ENV !== "development") return;

		const onUnhandled = (event: PromiseRejectionEvent) => {
			// Ajuda a identificar objetos não-Error, ex.: [object Event]
			const reason = event.reason;
			// eslint-disable-next-line no-console
			console.error("Unhandled rejection (dev logger):", reason);
		};

		window.addEventListener("unhandledrejection", onUnhandled);
		return () => window.removeEventListener("unhandledrejection", onUnhandled);
	}, []);

	return null;
}


