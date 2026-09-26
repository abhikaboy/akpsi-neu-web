import { AlertTriangle, Check, Star } from "lucide-react";
import { useMemo } from "react";
import CandidateChat from "./CandidateChat";
import { findImageAnswer, Headshot, isImageUrl } from "./Headshot";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import {
	REQUIRED_EVENT_COUNT,
	type DeliberationProfile,
} from "../../lib/adminEvals";
import type { EvalFormType } from "../../lib/sanity";

type ProfileEvaluation = DeliberationProfile["evaluations"][number];

export const FORM_ORDER: EvalFormType[] = [
	"rushEval",
	"invitationalEval",
	"interview",
];
export const FORM_LABELS: Record<EvalFormType, string> = {
	rushEval: "Rush Eval",
	invitationalEval: "Invitational Eval",
	interview: "Interview",
};

const FILE_RE = /^https?:\/\/.*\.(pdf|jpe?g|png|webp|gif)$/i;

export function formatDate(value: string | null): string {
	if (!value) return "—";
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

/**
 * A candidate's scores per form, shown under their name/photo in both the
 * deliberation list row and the full candidate page.
 */
export function CandidateScoreStrip({
	profile,
}: {
	profile: DeliberationProfile;
}) {
	return (
		<div className="flex flex-wrap gap-4">
			{FORM_ORDER.map((formType) => {
				const summary = profile.summary?.[formType];
				const count = summary?.count ?? 0;
				const isMine = (profile.myFormTypes ?? []).includes(formType);
				return (
					<div key={formType} className="text-xs">
						<span className="text-muted-foreground">
							{FORM_LABELS[formType]}
							{isMine && (
								<Check
									className="inline size-3 ml-0.5 -mt-0.5 text-primary"
									aria-label="You evaluated this form"
								/>
							)}
							:{" "}
						</span>
						<span
							className={count === 0 ? "text-muted-foreground" : "font-medium"}
						>
							{summary?.averageScore == null ? "—" : `${summary.averageScore}%`}
						</span>
						<span className="text-muted-foreground"> ({count})</span>
					</div>
				);
			})}
		</div>
	);
}

/**
 * Event count with a mild flag when the rushee is short of the attendance
 * requirement. Shown next to the name in both the list row and the full page.
 */
export function AttendanceBadge({
	profile,
	className,
}: {
	profile: DeliberationProfile;
	className?: string;
}) {
	const attended = profile.eventsAttended ?? 0;
	const infoSessions = profile.infoSessionsAttended ?? 0;
	const short = attended < REQUIRED_EVENT_COUNT;
	// Green means fully in the clear: the event minimum plus an info session.
	const fullyMet = !short && infoSessions > 0;
	const tone = short
		? "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
		: fullyMet
			? "border-green-300 bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-200"
			: "";
	return (
		<Badge
			variant="outline"
			className={`${tone} ${className ?? ""}`.trim() || undefined}
			title={
				short
					? `Attended ${attended} of the ${REQUIRED_EVENT_COUNT} required events`
					: fullyMet
						? `Attended ${attended} events, including ${infoSessions} info session${infoSessions === 1 ? "" : "s"}`
						: `Attended ${attended} events, but no info session`
			}
		>
			{short && <AlertTriangle className="size-3" aria-hidden />}
			{attended} event{attended === 1 ? "" : "s"}
			{infoSessions > 0 && ` · ${infoSessions} info`}
		</Badge>
	);
}

/** Every rush event the candidate checked into, info sessions called out. */
function AttendanceSection({ profile }: { profile: DeliberationProfile }) {
	const attendance = profile.attendance ?? [];
	const attended = attendance.length;
	const short = attended < REQUIRED_EVENT_COUNT;

	return (
		<div>
			<h3 className="text-sm font-semibold mb-3">
				Attendance{" "}
				<span className="text-muted-foreground font-normal">
					({attended} event{attended === 1 ? "" : "s"})
				</span>
			</h3>

			{short && (
				<p className="mb-3 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
					<AlertTriangle className="size-3.5 shrink-0" aria-hidden />
					Attended {attended} of the {REQUIRED_EVENT_COUNT} required events.
				</p>
			)}

			{attended === 0 ? (
				<p className="text-sm text-muted-foreground">
					No check-ins on file for this email.
				</p>
			) : (
				<ul className="border rounded-md divide-y">
					{attendance.map((event) => (
						<li
							key={event.eventId || event.eventName}
							className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm ${
								event.isInfoSession ? "bg-primary/5" : ""
							}`}
						>
							<span className="flex items-center gap-2 min-w-0">
								{event.isInfoSession && (
									<Star
										className="size-3.5 shrink-0 text-primary"
										aria-label="Info session"
									/>
								)}
								<span
									className={`truncate ${event.isInfoSession ? "font-semibold" : ""}`}
								>
									{event.eventName}
								</span>
							</span>
							<span className="text-xs text-muted-foreground">
								{formatDate(event.eventDate)}
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

export function candidatePhoto(
	profile: DeliberationProfile,
): string | null | undefined {
	return profile.photoUrl ?? findImageAnswer(profile.application?.answers);
}

/**
 * The full deliberation record for one candidate: application answers, every
 * eval/interview on file, and the discussion thread. Shared between the
 * expandable row on /admin/deliberate and the dedicated full-page view so the
 * two stay in sync as fields are added.
 */
export default function CandidateDetail({
	profile,
	cycle,
	viewerEmail,
}: {
	profile: DeliberationProfile;
	cycle: string;
	viewerEmail: string;
}) {
	return (
		<div className="space-y-6">
			<section>
				<h3 className="text-sm font-semibold mb-3">Application</h3>
				{profile.application ? (
					<>
						<p className="text-xs text-muted-foreground mb-3">
							Submitted {formatDate(profile.application.submittedAt)}
						</p>
						<div className="grid gap-3 sm:grid-cols-2">
							{(profile.application.answers ?? []).map((answer) => (
								<div key={answer.label}>
									<p className="text-xs font-semibold text-muted-foreground">
										{answer.label}
									</p>
									{isImageUrl(answer.value) ? (
										<a
											href={answer.value}
											target="_blank"
											rel="noreferrer"
											className="inline-block mt-1"
										>
											<Headshot src={answer.value} name={profile.name} size={64} />
										</a>
									) : FILE_RE.test(answer.value) ? (
										<a
											href={answer.value}
											target="_blank"
											rel="noreferrer"
											className="text-sm text-primary underline break-all"
										>
											View file
										</a>
									) : (
										<p className="text-sm break-words whitespace-pre-wrap">
											{answer.value || "—"}
										</p>
									)}
								</div>
							))}
						</div>
					</>
				) : (
					<p className="text-sm text-muted-foreground">
						This rushee was evaluated but never submitted an application.
					</p>
				)}
			</section>

			<section>
				<Separator className="mb-6" />
				<AttendanceSection profile={profile} />
			</section>

			{FORM_ORDER.map((formType) => {
				const forForm = (profile.evaluations ?? []).filter(
					(e) => e.formType === formType,
				);
				if (forForm.length === 0) return null;
				return (
					<section key={formType}>
						<Separator className="mb-6" />
						{formType === "interview" ? (
							<InterviewSection
								title={FORM_LABELS[formType]}
								evaluation={forForm[0]}
							/>
						) : (
							<EvalFormSection
								title={FORM_LABELS[formType]}
								evaluations={forForm}
							/>
						)}
					</section>
				);
			})}

			{cycle && (
				<section>
					<Separator className="mb-6" />
					<h3 className="text-sm font-semibold mb-3">Discussion</h3>
					<CandidateChat
						cycle={cycle}
						candidateEmail={profile.email}
						viewerEmail={viewerEmail}
					/>
				</section>
			)}
		</div>
	);
}

/**
 * One form type's worth of evals: a per-criterion average row up top, then a
 * table with one row per evaluator and one column per criterion, plus a
 * column for their freeform notes.
 */
function EvalFormSection({
	title,
	evaluations,
}: {
	title: string;
	evaluations: ProfileEvaluation[];
}) {
	// Criterion columns, in the order they first appear, shared across evaluators.
	const criteriaLabels = useMemo(() => {
		const labels: string[] = [];
		for (const evaluation of evaluations) {
			for (const response of evaluation.responses ?? []) {
				if (response.fieldType === "score" && !labels.includes(response.label)) {
					labels.push(response.label);
				}
			}
		}
		return labels;
	}, [evaluations]);

	const averages = useMemo(() => {
		return criteriaLabels.map((label) => {
			const scores = evaluations
				.map((evaluation) =>
					(evaluation.responses ?? []).find((r) => r.label === label),
				)
				.filter(
					(response): response is NonNullable<typeof response> =>
						response?.score != null,
				)
				.map((response) => response.score as number);
			if (scores.length === 0) return null;
			return scores.reduce((sum, score) => sum + score, 0) / scores.length;
		});
	}, [criteriaLabels, evaluations]);

	const notesFor = (evaluation: ProfileEvaluation) =>
		(evaluation.responses ?? [])
			.filter((r) => r.fieldType !== "score" && r.value)
			.map((r) => r.value)
			.join(" / ");

	return (
		<div>
			<h3 className="text-sm font-semibold mb-3">
				{title}{" "}
				<span className="text-muted-foreground font-normal">
					({evaluations.length} submitted)
				</span>
			</h3>

			<div className="border rounded-md overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="bg-muted/50 text-left text-xs text-muted-foreground">
							{/* The evaluator and score columns shrink to their content so
							    Notes absorbs whatever width is left over. */}
							<th className="w-px px-3 py-2 font-medium whitespace-nowrap">
								Evaluator
							</th>
							{criteriaLabels.map((label) => (
								<th
									key={label}
									className="w-px px-3 py-2 font-medium whitespace-nowrap uppercase"
									title={label}
								>
									{label.split(" ")[0]}
								</th>
							))}
							<th className="w-full px-3 py-2 font-medium">Notes</th>
						</tr>
					</thead>
					<tbody>
						<tr className="border-t bg-muted/30 font-semibold">
							<td className="w-px px-3 py-2 whitespace-nowrap">Average</td>
							{averages.map((average, i) => (
								<td key={criteriaLabels[i]} className="w-px px-3 py-2">
									{average == null ? "—" : average.toFixed(1)}
								</td>
							))}
							<td className="px-3 py-2" />
						</tr>
						{evaluations.map((evaluation) => (
							<tr key={evaluation._id} className="border-t hover:bg-muted/20">
								<td className="w-px px-3 py-2 whitespace-nowrap">
									{evaluation.evaluatorName}
								</td>
								{criteriaLabels.map((label) => {
									const response = (evaluation.responses ?? []).find(
										(r) => r.label === label,
									);
									return (
										<td key={label} className="w-px px-3 py-2">
											{response?.score ?? "—"}
										</td>
									);
								})}
								<td className="w-full min-w-[18rem] px-3 py-2 break-words whitespace-pre-wrap">
									{notesFor(evaluation) || "—"}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

/**
 * The single interview on file for a candidate, shown as a plain question /
 * answer list rather than a table since there's only ever one interviewer.
 */
function InterviewSection({
	title,
	evaluation,
}: {
	title: string;
	evaluation: ProfileEvaluation;
}) {
	return (
		<div>
			<h3 className="text-sm font-semibold mb-3">
				{title}{" "}
				<span className="text-muted-foreground font-normal">
					— {evaluation.evaluatorName}
				</span>
			</h3>

			<div className="border rounded-md divide-y">
				{(evaluation.responses ?? []).map((response) => (
					<div
						key={response.label}
						className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-3 px-3 py-2.5"
					>
						<p className="text-sm font-medium text-muted-foreground">
							{response.label}
						</p>
						<p className="text-sm break-words whitespace-pre-wrap">
							{response.fieldType === "score" && response.score != null
								? `${response.score}${response.scoreMax ? ` / ${response.scoreMax}` : ""}`
								: response.value || "—"}
						</p>
					</div>
				))}
			</div>
		</div>
	);
}
