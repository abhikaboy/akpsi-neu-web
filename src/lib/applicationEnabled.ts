import { useEffect, useState } from "react";
import { getApplicationEnabled } from "./sanity";

/**
 * Whether the public application is open, set in Sanity under Chapter Settings.
 * Defaults to closed so a failed fetch or an unset toggle never exposes the
 * form outside a cycle.
 */
export function useApplicationEnabled(): { enabled: boolean; loading: boolean } {
	const [enabled, setEnabled] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		getApplicationEnabled()
			.then(setEnabled)
			.catch(() => setEnabled(false))
			.finally(() => setLoading(false));
	}, []);

	return { enabled, loading };
}
