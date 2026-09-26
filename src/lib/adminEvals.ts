import { readError } from "./adminApplications";
import {
	NOT_MODIFIED,
	hasCached,
	invalidateApiCache,
	swrJson,
} from "./apiCache";
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

export interface AttendanceRecord {
	eventId: string;
	eventName: string;
	eventDate: string | null;
	isInfoSession: boolean;
}

/** Rush events a rushee must attend; mirrors REQUIRED_EVENT_COUNT in the API. */
export const REQUIRED_EVENT_COUNT = 3;

export interface FormSummary {
	count: number;
	averageScore: number | null;
	evaluatorNames: string[];
}

export interface DeliberationProfile {
	email: string;
	/** Other addresses merged into this profile by an exact name match. */
	aliasEmails: string[];
	name: string;
	cycle: string;
	application: {
		_id: string;
		status: string;
		submittedAt: string | null;
		/** Detail requests only; the chapter-wide list omits it. */
		answers?: { label: string; value: string }[];
	} | null;
	/** Image uploaded on the application, if any; the UI falls back to initials. */
	photoUrl: string | null;
	evaluations: {
		_id: string;
		formType: EvalFormType;
		evaluatorName: string;
		rawAverage: number | null;
		normalizedScore: number | null;
		/** Detail requests only; the chapter-wide list omits it. */
		responses?: EvalResponseValue[];
		submittedAt: string | null;
	}[];
	summary: Record<EvalFormType, FormSummary>;
	/** Forms the signed-in brother has personally filed on this rushee. */
	myFormTypes: EvalFormType[];
	/** Rush events this rushee checked into, oldest first, deduped by event. */
	attendance: AttendanceRecord[];
	eventsAttended: number;
	infoSessionsAttended: number;
	/** True when they attended fewer than REQUIRED_EVENT_COUNT events. */
	belowEventRequirement: boolean;
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

/**
 * As getJson, but reports a bare 304 instead of failing on it. A 304 carries no
 * body and is not `res.ok`, so it has to be separated from a real error before
 * the status check.
 */
async function getJsonRevalidating<T>(
	url: string,
): Promise<Partial<T> | typeof NOT_MODIFIED> {
	const res = await fetch(url);
	if (res.status === 401) throw new Error("unauthenticated");
	if (res.status === 304 && hasCached(url)) return NOT_MODIFIED;
	if (!res.ok) throw new Error(await readError(res));
	return (await res.json()) as Partial<T>;
}

/**
 * Serves the previous body for this URL straight away, then revalidates and
 * calls `onUpdate` if anything changed. See src/lib/apiCache.ts.
 */
function getJsonCached<T>(
	url: string,
	onUpdate?: (fresh: Partial<T>) => void,
): Promise<Partial<T>> {
	return swrJson(url, getJsonRevalidating<T>, onUpdate);
}

export async function fetchRushees(
	cycle?: string,
	onUpdate?: (roster: Rushee[]) => void,
): Promise<Rushee[]> {
	const query = cycle ? `?cycle=${encodeURIComponent(cycle)}` : "";
	const body = await getJsonCached<{ roster: Rushee[] }>(
		`/api/eval-roster${query}`,
		(fresh) => onUpdate?.(fresh.roster ?? []),
	);
	return body.roster ?? [];
}

export async function fetchEvaluations(filters?: {
	formType?: EvalFormType;
	cycle?: string;
	applicantEmail?: string;
	/** Restrict to the signed-in brother's own evaluations. */
	mine?: boolean;
	/** Called if a background revalidation turns up different data. */
	onUpdate?: (evaluations: EvaluationRecord[]) => void;
}): Promise<EvaluationRecord[]> {
	const params = new URLSearchParams();
	if (filters?.formType) params.set("formType", filters.formType);
	if (filters?.cycle) params.set("cycle", filters.cycle);
	if (filters?.applicantEmail)
		params.set("applicantEmail", filters.applicantEmail);
	if (filters?.mine) params.set("mine", "true");
	const query = params.toString();
	const body = await getJsonCached<{ evaluations: EvaluationRecord[] }>(
		`/api/evaluations${query ? `?${query}` : ""}`,
		(fresh) => filters?.onUpdate?.(fresh.evaluations ?? []),
	);
	return body.evaluations ?? [];
}

/**
 * The ranked roster for the deliberation table. Application answers and
 * evaluation responses are left out — they dominate the payload and no list
 * view reads them. Use `fetchCandidateProfile` for the one candidate on screen.
 */
export async function fetchDeliberation(
	cycle?: string,
	onUpdate?: (profiles: DeliberationProfile[]) => void,
): Promise<DeliberationProfile[]> {
	const query = cycle ? `?cycle=${encodeURIComponent(cycle)}` : "";
	const body = await getJsonCached<{ profiles: DeliberationProfile[] }>(
		`/api/deliberate${query}`,
		(fresh) => onUpdate?.(fresh.profiles ?? []),
	);
	return body.profiles ?? [];
}

/** One candidate with their full application answers and eval responses. */
export async function fetchCandidateProfile(
	email: string,
	cycle?: string,
	onUpdate?: (profile: DeliberationProfile | null) => void,
): Promise<DeliberationProfile | null> {
	const params = new URLSearchParams({ email });
	if (cycle) params.set("cycle", cycle);
	const body = await getJsonCached<{ profile: DeliberationProfile }>(
		`/api/deliberate?${params.toString()}`,
		(fresh) => onUpdate?.(fresh.profile ?? null),
	);
	return body.profile ?? null;
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
	// A new evaluation changes the roster's scores and the candidate's detail,
	// so the cached copies of both have to go before the next read.
	invalidateApiCache("/api/evaluations");
	invalidateApiCache("/api/deliberate");
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
	const body = await getJsonCached<{ statuses: InterviewStatusRecord[] }>(
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
	invalidateApiCache("/api/interview-status");
}
