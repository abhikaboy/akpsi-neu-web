export interface ApplicationSubmission {
	cycle: string;
	name: string;
	email: string;
	answers: { label: string; value: string }[];
	rusheeId?: string;
}

export interface ApplicationSubmitResult {
	name: string;
}

export interface ApplicationStatus {
	submitted: boolean;
	name: string | null;
}

async function readError(res: Response): Promise<string> {
	const body = await res.json().catch(() => null);
	return body?.error ?? "Failed to submit application.";
}

export async function checkApplicationStatus(params: {
	cycle: string;
	rusheeId?: string;
	email?: string;
}): Promise<ApplicationStatus> {
	const search = new URLSearchParams({ cycle: params.cycle });
	if (params.rusheeId) search.set("rusheeId", params.rusheeId);
	if (params.email) search.set("email", params.email);

	// Status check rides on the same /api/apply function as submit (GET vs POST)
	// to stay under Vercel's Hobby serverless-function limit.
	const res = await fetch(`/api/apply?${search}`);
	if (!res.ok) throw new Error(await readError(res));
	return res.json();
}

export async function submitApplication(
	submission: ApplicationSubmission,
): Promise<ApplicationSubmitResult> {
	const res = await fetch("/api/apply", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(submission),
	});
	if (!res.ok) {
		throw new Error(await readError(res));
	}
	const body = await res.json().catch(() => null);
	return { name: body?.name ?? submission.name.trim() };
}
