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

export const INTERVIEW_STAGES = [
	"to-interview",
	"in-progress",
	"complete",
] as const;
export type InterviewStage = (typeof INTERVIEW_STAGES)[number];

export const INTERVIEW_STAGE_LABELS: Record<InterviewStage, string> = {
	"to-interview": "To Interview",
	"in-progress": "In Progress",
	complete: "Complete",
};

export const INTERVIEW_ROLES = [
	"facilitator",
	"video-bro",
	"note-taker-bro",
	"chillin-bro",
] as const;
export type InterviewRole = (typeof INTERVIEW_ROLES)[number];

export const INTERVIEW_ROLE_LABELS: Record<InterviewRole, string> = {
	facilitator: "Facilitator",
	"video-bro": "Video Bro",
	"note-taker-bro": "Note Taker Bro",
	"chillin-bro": "Chillin Bro",
};

export const MAX_INTERVIEW_ASSIGNMENTS = 6;

export interface InterviewAssignment {
	role: InterviewRole;
	memberEmail: string;
	memberName: string;
	memberPictureUrl?: string | null;
}

export interface InterviewStatusRecord {
	_id: string;
	cycle: string;
	applicantEmail: string;
	applicantName: string;
	stage?: InterviewStage;
	scheduledAt?: string;
	assignments?: InterviewAssignment[];
	updatedByName?: string;
	updatedAt?: string;
}

export async function fetchInterviewStatuses(
	cycle: string,
): Promise<InterviewStatusRecord[]> {
	const body = await getJson<{ statuses: InterviewStatusRecord[] }>(
		`/api/interview-status?cycle=${encodeURIComponent(cycle)}`,
	);
	return body.statuses ?? [];
}

/**
 * Stage and date patch independently — omit a field to leave it untouched, and
 * pass `scheduledAt: null` to clear a date.
 */
export async function saveInterviewStatus(update: {
	cycle: string;
	applicantEmail: string;
	applicantName: string;
	stage?: InterviewStage;
	scheduledAt?: string | null;
	assignments?: InterviewAssignment[];
}): Promise<void> {
	const res = await fetch("/api/interview-status", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(update),
	});
	if (res.status === 401) throw new Error("unauthenticated");
	if (!res.ok) throw new Error(await readError(res));
}
