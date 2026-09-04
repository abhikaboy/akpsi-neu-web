import { readError } from "./adminApplications";
import type { EvalFormType } from "./sanity";

export interface EvalResponseValue {
	label: string;
	fieldType: string;
	value: string;
	score: number | null;
	scoreMin: number | null;
	scoreMax: number | null;
	weight: number;
}

export interface EvaluationRecord {
	_id: string;
	formType: EvalFormType;
	cycle: string;
	applicantName: string;
	applicantEmail: string;
	evaluatorName: string;
	evaluatorEmail: string;
	responses: EvalResponseValue[];
	rawAverage: number | null;
	normalizedScore: number | null;
	submittedAt: string;
}

export interface Rushee {
	name: string;
	email: string;
	hasApplication: boolean;
}

export interface FormSummary {
	count: number;
	averageScore: number | null;
	evaluatorNames: string[];
}

export interface DeliberationProfile {
	email: string;
	name: string;
	cycle: string;
	application: {
		_id: string;
		status: string;
		submittedAt: string | null;
		answers: { label: string; value: string }[];
	} | null;
	/** Image uploaded on the application, if any; the UI falls back to initials. */
	photoUrl: string | null;
	evaluations: {
		_id: string;
		formType: EvalFormType;
		evaluatorName: string;
		rawAverage: number | null;
		normalizedScore: number | null;
		responses: EvalResponseValue[];
		submittedAt: string | null;
	}[];
	summary: Record<EvalFormType, FormSummary>;
	/** Forms the signed-in brother has personally filed on this rushee. */
	myFormTypes: EvalFormType[];
	overallScore: number | null;
	totalEvaluations: number;
}

/** 401 is surfaced as `unauthenticated` so pages can drop back to the login gate. */
async function getJson<T>(url: string): Promise<Partial<T>> {
	const res = await fetch(url);
	if (res.status === 401) throw new Error("unauthenticated");
	if (!res.ok) throw new Error(await readError(res));
	return (await res.json()) as Partial<T>;
}

export async function fetchRushees(cycle?: string): Promise<Rushee[]> {
	const query = cycle ? `?cycle=${encodeURIComponent(cycle)}` : "";
	const body = await getJson<{ roster: Rushee[] }>(`/api/eval-roster${query}`);
	return body.roster ?? [];
}

export async function fetchEvaluations(filters?: {
	formType?: EvalFormType;
	cycle?: string;
	applicantEmail?: string;
	/** Restrict to the signed-in brother's own evaluations. */
	mine?: boolean;
}): Promise<EvaluationRecord[]> {
	const params = new URLSearchParams();
	if (filters?.formType) params.set("formType", filters.formType);
	if (filters?.cycle) params.set("cycle", filters.cycle);
	if (filters?.applicantEmail)
		params.set("applicantEmail", filters.applicantEmail);
	if (filters?.mine) params.set("mine", "true");
	const query = params.toString();
	const body = await getJson<{ evaluations: EvaluationRecord[] }>(
		`/api/evaluations${query ? `?${query}` : ""}`,
	);
	return body.evaluations ?? [];
}

export async function fetchDeliberation(
	cycle?: string,
): Promise<DeliberationProfile[]> {
	const query = cycle ? `?cycle=${encodeURIComponent(cycle)}` : "";
	const body = await getJson<{ profiles: DeliberationProfile[] }>(
		`/api/deliberate${query}`,
	);
	return body.profiles ?? [];
}

export async function submitEvaluation(evaluation: {
	formType: EvalFormType;
	cycle: string;
	applicantName: string;
	applicantEmail: string;
	responses: EvalResponseValue[];
}): Promise<void> {
	const res = await fetch("/api/evaluations", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(evaluation),
	});
	if (res.status === 401) throw new Error("unauthenticated");
	if (!res.ok) throw new Error(await readError(res));
}
