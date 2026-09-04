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
}

export async function readError(res: Response): Promise<string> {
	const body = await res.json().catch(() => null);
	return body?.error ?? "Something went wrong.";
}

export async function checkAdminSession(): Promise<AdminUser | null> {
	const res = await fetch("/api/admin-session");
	if (!res.ok) return null;
	const body = await res.json();
	return body?.authenticated ? (body.user as AdminUser) : null;
}

export async function adminLogin(credentials: {
	name: string;
	email: string;
	password: string;
}): Promise<AdminUser> {
	const res = await fetch("/api/admin-login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(credentials),
	});
	if (!res.ok) throw new Error(await readError(res));
	const body = await res.json();
	return body.user as AdminUser;
}

export async function adminLogout(): Promise<void> {
	await fetch("/api/admin-logout", { method: "POST" });
}

export async function fetchApplications(
	cycle?: string,
): Promise<ApplicationRecord[]> {
	const query = cycle ? `?cycle=${encodeURIComponent(cycle)}` : "";
	const res = await fetch(`/api/applications${query}`);
	if (res.status === 401) throw new Error("unauthenticated");
	if (!res.ok) throw new Error(await readError(res));
	const body = await res.json();
	return body.applications ?? [];
}
