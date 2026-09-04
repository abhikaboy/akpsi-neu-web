import { useEffect, useState } from "react";
import { getActiveCycle } from "./sanity";
import { getApplicationCycleOptions } from "./applicationCycles";

export interface ActiveCycleState {
	cycle: string | null;
	label: string;
	loading: boolean;
	error: string | null;
}

/**
 * The one cycle everything operates on, set in Sanity under Chapter Settings.
 * Pages don't offer a cycle picker — a single source means an application or an
 * evaluation can't be filed against the wrong cycle by accident.
 */
export function useActiveCycle(): ActiveCycleState {
	const [cycle, setCycle] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		getActiveCycle()
			.then((value) => {
				setCycle(value);
				if (!value)
					setError("No active cycle is set in Sanity under Chapter Settings.");
			})
			.catch(() => setError("Failed to load the active application cycle."))
			.finally(() => setLoading(false));
	}, []);

	const label = cycle
		? (getApplicationCycleOptions().find((option) => option.value === cycle)
				?.label ?? cycle)
		: "";

	return { cycle, label, loading, error };
}
