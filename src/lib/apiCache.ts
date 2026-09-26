/**
 * A tiny stale-while-revalidate cache for admin GET requests.
 *
 * The API sends an ETag on these responses, so a repeat request already comes
 * back as an empty 304 rather than a fresh payload. What that does not remove
 * is the round trip — the page still waits on the network before it can render
 * anything. Holding the last body in memory lets a revisited page paint
 * immediately from the previous result, then update in place if the
 * revalidation turns up something different.
 *
 * Deliberately in-memory and per-tab: this is applicant data behind a login,
 * so it should not outlive the tab.
 */

const cache = new Map<string, unknown>();
/** One request per URL in flight; concurrent callers share the same promise. */
const inflight = new Map<string, Promise<unknown>>();

/**
 * Returned by a fetcher that got a 304, meaning the cached body is still
 * current. Browsers usually turn a 304 back into the stored 200 before `fetch`
 * sees it, but that only works while the body is still in the HTTP cache — it
 * can be evicted, or the request can come from a tab that never held it. When
 * a bare 304 does surface it has no body and a `res.ok` check rejects it, so
 * the fetchers report it explicitly rather than treating it as a failure.
 */
export const NOT_MODIFIED = Symbol("not-modified");

/** True when this URL has a body cached, so a 304 has something to resolve to. */
export function hasCached(url: string): boolean {
	return cache.has(url);
}

/** Dropped on sign-out so the next brother never sees the last one's view. */
export function clearApiCache(): void {
	cache.clear();
	inflight.clear();
}

/** Discards cached entries whose URL contains `fragment`, e.g. after a write. */
export function invalidateApiCache(fragment: string): void {
	for (const key of cache.keys()) {
		if (key.includes(fragment)) cache.delete(key);
	}
}

/**
 * Resolves with the cached body when there is one, revalidating in the
 * background and invoking `onUpdate` only if the fresh body actually differs.
 * With no cached body it behaves like a plain fetch.
 */
export async function swrJson<T>(
	url: string,
	fetcher: (url: string) => Promise<T | typeof NOT_MODIFIED>,
	onUpdate?: (fresh: T) => void,
): Promise<T> {
	const revalidate = () => {
		const existing = inflight.get(url);
		if (existing) return existing as Promise<T>;
		const request = fetcher(url)
			.then((result) => {
				// A 304 means what we already hold is current, so there is nothing
				// to store and nothing changed worth telling the caller about.
				if (result === NOT_MODIFIED) return cache.get(url) as T;
				const fresh = result as T;
				// Compared as JSON so an unchanged response doesn't re-render the
				// table and throw away scroll position mid-deliberation.
				const changed =
					JSON.stringify(fresh) !== JSON.stringify(cache.get(url));
				cache.set(url, fresh);
				if (changed) onUpdate?.(fresh);
				return fresh;
			})
			.finally(() => {
				inflight.delete(url);
			});
		inflight.set(url, request);
		return request;
	};

	if (cache.has(url)) {
		// Failures here are silent on purpose: the caller already has a usable
		// body, and a background refresh dying is not worth an error screen.
		revalidate().catch(() => {});
		return cache.get(url) as T;
	}

	return revalidate();
}
