import { NOT_MODIFIED, clearApiCache, hasCached, swrJson } from "./apiCache";
export interface ApplicationRecord {
	_id: string;
	cycle: string;
	name: string;
	email: string;
	answers: { label: string; value: string }[];
	submittedAt: string;
	status: string;
}

export interface AdminUser {
	name: string;
	email: string;
	pictureUrl?: string | null;
}

export async function readError(res: Response): Promise<string> {
	const body = await res.json().catch(() => null);
	return body?.error ?? "Something went wrong.";
}

export async function checkAdminSession(): Promise<AdminUser | null> {
	const res = await fetch("/api/admin-auth?action=session");
	if (!res.ok) return null;
	const body = await res.json();
	return body?.authenticated ? (body.user as AdminUser) : null;
}

export async function adminLogin(credentials: {
	name: string;
	email: string;
	password: string;
}): Promise<AdminUser> {
	const res = await fetch("/api/admin-auth?action=login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(credentials),
	});
	if (!res.ok) throw new Error(await readError(res));
	const body = await res.json();
	return body.user as AdminUser;
}

export async function adminLogout(): Promise<void> {
	await fetch("/api/admin-auth?action=logout", { method: "POST" });
	// Applicant data is per-viewer and behind a login; none of it should still
	// be in memory for whoever signs in next on this machine.
	clearApiCache();
}

export async function fetchApplications(
	cycle?: string,
	onUpdate?: (applications: ApplicationRecord[]) => void,
): Promise<ApplicationRecord[]> {
	const query = cycle ? `?cycle=${encodeURIComponent(cycle)}` : "";
	const body = await swrJson(
		`/api/applications${query}`,
		async (url) => {
			const res = await fetch(url);
			if (res.status === 401) throw new Error("unauthenticated");
			// 304 has no body and is not `res.ok`; the cached copy is still good.
			if (res.status === 304 && hasCached(url)) return NOT_MODIFIED;
			if (!res.ok) throw new Error(await readError(res));
			return (await res.json()) as { applications?: ApplicationRecord[] };
		},
		(fresh) => onUpdate?.(fresh.applications ?? []),
	);
	return body.applications ?? [];
}
