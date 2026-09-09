import { CalendarClock, GripVertical } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import {
	fetchEvaluations,
	fetchInterviewStatuses,
	fetchRushees,
	INTERVIEW_ROLE_LABELS,
	INTERVIEW_ROLES,
	INTERVIEW_STAGE_LABELS,
	INTERVIEW_STAGES,
	MAX_INTERVIEW_ASSIGNMENTS,
	saveInterviewStatus,
	type EvaluationRecord,
	type InterviewAssignment,
	type InterviewStage,
	type InterviewStatusRecord,
	type Rushee,
} from "../../lib/adminEvals";
import { Headshot } from "./Headshot";

export interface BoardCandidate {
	email: string;
	name: string;
	stage: InterviewStage;
	/** True when the stage was set by hand rather than inferred from evals. */
	stageExplicit: boolean;
	scheduledAt: string | null;
	interviewCount: number;
	interviewers: string[];
	assignments: InterviewAssignment[];
}

/**
 * Candidates only get a stored stage once someone moves them, so an unset
 * candidate is placed by whether any interview has been filed. That keeps a
 * fresh cycle usable with no backfill.
 */
function derivedStage(interviewCount: number): InterviewStage {
	return interviewCount > 0 ? "in-progress" : "to-interview";
}

export function useBoardData(cycle: string | null, cycleLoading: boolean) {
	const [candidates, setCandidates] = useState<BoardCandidate[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const build = (
		roster: Rushee[],
		evaluations: EvaluationRecord[],
		statuses: InterviewStatusRecord[],
	): BoardCandidate[] => {
		const byEmail = new Map<string, BoardCandidate>();
		const ensure = (email: string, name: string) => {
			let entry = byEmail.get(email);
			if (!entry) {
				entry = {
					email,
					name: name || email,
					stage: "to-interview",
					stageExplicit: false,
					scheduledAt: null,
					interviewCount: 0,
					interviewers: [],
					assignments: [],
				};
				byEmail.set(email, entry);
			}
			return entry;
		};

		for (const person of roster) ensure(person.email, person.name);
		for (const evaluation of evaluations) {
			const entry = ensure(evaluation.applicantEmail, evaluation.applicantName);
			entry.interviewCount += 1;
			entry.interviewers.push(evaluation.evaluatorName);
		}
		for (const status of statuses) {
			const entry = ensure(status.applicantEmail, status.applicantName);
			if (status.stage) {
				entry.stage = status.stage;
				entry.stageExplicit = true;
			}
			entry.scheduledAt = status.scheduledAt ?? null;
			entry.assignments = status.assignments ?? [];
		}

		for (const entry of byEmail.values()) {
			if (!entry.stageExplicit)
				entry.stage = derivedStage(entry.interviewCount);
		}

		return Array.from(byEmail.values()).sort((a, b) =>
			a.name.localeCompare(b.name),
		);
	};

	const load = () => {
		if (cycleLoading) return;
		if (!cycle) {
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		Promise.all([
			fetchRushees(cycle),
			fetchEvaluations({ cycle, formType: "interview" }),
			fetchInterviewStatuses(cycle),
		])
			.then(([roster, evaluations, statuses]) =>
				setCandidates(build(roster, evaluations, statuses)),
			)
			.catch((err) => {
				if (err instanceof Error && err.message === "unauthenticated") {
					window.location.reload();
					return;
				}
				setError(
					err instanceof Error ? err.message : "Failed to load interview data.",
				);
			})
			.finally(() => setLoading(false));
	};

	useEffect(load, [cycle, cycleLoading]);

	/** Optimistic: the board moves immediately and rolls back if the save fails. */
	const update = async (
		candidate: BoardCandidate,
		patch: {
			stage?: InterviewStage;
			scheduledAt?: string | null;
			assignments?: InterviewAssignment[];
		},
	) => {
		const previous = candidates;
		setCandidates((prev) =>
			prev.map((c) =>
				c.email === candidate.email
					? {
							...c,
							...(patch.stage
								? { stage: patch.stage, stageExplicit: true }
								: {}),
							...(patch.scheduledAt !== undefined
								? { scheduledAt: patch.scheduledAt }
								: {}),
							...(patch.assignments !== undefined
								? { assignments: patch.assignments }
								: {}),
						}
					: c,
			),
		);
		try {
			await saveInterviewStatus({
				cycle: cycle as string,
				applicantEmail: candidate.email,
				applicantName: candidate.name,
				...patch,
			});
		} catch (err) {
			setCandidates(previous);
			if (err instanceof Error && err.message === "unauthenticated") {
				window.location.reload();
				return;
			}
			toast.error(err instanceof Error ? err.message : "Failed to save.");
		}
	};

	return { candidates, loading, error, update };
}

/** Native HTML5 drag-and-drop, with a per-card select as the accessible path. */
export function InterviewBoard({
	candidates,
	onMove,
}: {
	candidates: BoardCandidate[];
	onMove: (candidate: BoardCandidate, stage: InterviewStage) => void;
}) {
	const [dragging, setDragging] = useState<string | null>(null);
	const [hoverStage, setHoverStage] = useState<InterviewStage | null>(null);

	const byStage = useMemo(() => {
		const grouped = {} as Record<InterviewStage, BoardCandidate[]>;
		for (const stage of INTERVIEW_STAGES) {
			grouped[stage] = candidates.filter((c) => c.stage === stage);
		}
		return grouped;
	}, [candidates]);

	return (
		<div className="grid gap-4 md:grid-cols-3">
			{INTERVIEW_STAGES.map((stage) => (
				<div
					key={stage}
					onDragOver={(e) => {
						e.preventDefault();
						setHoverStage(stage);
					}}
					onDragLeave={() =>
						setHoverStage((prev) => (prev === stage ? null : prev))
					}
					onDrop={(e) => {
						e.preventDefault();
						setHoverStage(null);
						const email = e.dataTransfer.getData("text/plain");
						const candidate = candidates.find((c) => c.email === email);
						if (candidate && candidate.stage !== stage)
							onMove(candidate, stage);
						setDragging(null);
					}}
					className={`rounded-xl border bg-muted/30 p-3 transition-colors ${
						hoverStage === stage ? "border-primary bg-primary/5" : ""
					}`}
				>
					<div className="flex items-center justify-between gap-2 mb-3 px-1">
						<h3 className="text-sm font-semibold">
							{INTERVIEW_STAGE_LABELS[stage]}
						</h3>
						<Badge variant="secondary">{byStage[stage].length}</Badge>
					</div>

					<div className="space-y-2 min-h-24">
						{byStage[stage].length === 0 && (
							<p className="text-xs text-muted-foreground px-1 py-6 text-center">
								Nothing here
							</p>
						)}
						{byStage[stage].map((candidate) => (
							<div
								key={candidate.email}
								draggable
								onDragStart={(e) => {
									e.dataTransfer.setData("text/plain", candidate.email);
									setDragging(candidate.email);
								}}
								onDragEnd={() => setDragging(null)}
								className={`rounded-lg border bg-card p-3 shadow-xs cursor-grab active:cursor-grabbing ${
									dragging === candidate.email ? "opacity-50" : ""
								}`}
							>
								<div className="flex items-start gap-2">
									<GripVertical className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
									<Headshot name={candidate.name} size={32} />
									<div className="min-w-0 flex-1">
										<p className="text-sm font-medium truncate">
											{candidate.name}
										</p>
										<p className="text-xs text-muted-foreground truncate">
											{candidate.email}
										</p>
									</div>
								</div>

								<div className="mt-2 pl-6 space-y-1">
									{candidate.scheduledAt && (
										<p className="flex items-center gap-1 text-xs text-muted-foreground">
											<CalendarClock className="size-3" />
											{new Date(candidate.scheduledAt).toLocaleString([], {
												month: "short",
												day: "numeric",
												hour: "numeric",
												minute: "2-digit",
											})}
										</p>
									)}
									<p className="text-xs text-muted-foreground">
										{candidate.interviewCount} interview
										{candidate.interviewCount === 1 ? "" : "s"} filed
									</p>
									{/* Keyboard/touch path — dragging alone isn't accessible. */}
									<select
										value={candidate.stage}
										onChange={(e) =>
											onMove(candidate, e.target.value as InterviewStage)
										}
										aria-label={`Stage for ${candidate.name}`}
										className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-xs cursor-pointer"
									>
										{INTERVIEW_STAGES.map((option) => (
											<option key={option} value={option}>
												{INTERVIEW_STAGE_LABELS[option]}
											</option>
										))}
									</select>
								</div>
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

interface BrotherOption {
	name: string;
	email: string;
	pictureUrl?: string | null;
}

/** Assigns/removes brothers with a role, capped at `MAX_INTERVIEW_ASSIGNMENTS`. */
function AssignmentEditor({
	candidate,
	brothers,
	onChange,
}: {
	candidate: BoardCandidate;
	brothers: BrotherOption[];
	onChange: (assignments: InterviewAssignment[]) => void;
}) {
	const [pendingEmail, setPendingEmail] = useState("");
	const [pendingRole, setPendingRole] = useState<
		(typeof INTERVIEW_ROLES)[number]
	>(INTERVIEW_ROLES[0]);

	const assigned = candidate.assignments;
	const full = assigned.length >= MAX_INTERVIEW_ASSIGNMENTS;
	const available = brothers.filter(
		(b) => !assigned.some((a) => a.memberEmail === b.email),
	);

	const addBrother = () => {
		const brother = available.find((b) => b.email === pendingEmail);
		if (!brother || full) return;
		onChange([
			...assigned,
			{
				role: pendingRole,
				memberEmail: brother.email,
				memberName: brother.name,
				memberPictureUrl: brother.pictureUrl ?? null,
			},
		]);
		setPendingEmail("");
	};

	const removeBrother = (email: string) => {
		onChange(assigned.filter((a) => a.memberEmail !== email));
	};

	const changeRole = (email: string, role: (typeof INTERVIEW_ROLES)[number]) => {
		onChange(
			assigned.map((a) => (a.memberEmail === email ? { ...a, role } : a)),
		);
	};

	return (
		<div className="mt-2 space-y-2 pl-6">
			{assigned.length > 0 && (
				<ul className="space-y-1.5">
					{assigned.map((a) => (
						<li
							key={a.memberEmail}
							className="flex items-center gap-2 text-xs"
						>
							<Headshot src={a.memberPictureUrl} name={a.memberName} size={20} />
							<span className="min-w-0 flex-1 truncate">{a.memberName}</span>
							<select
								value={a.role}
								onChange={(e) =>
									changeRole(
										a.memberEmail,
										e.target.value as (typeof INTERVIEW_ROLES)[number],
									)
								}
								aria-label={`Role for ${a.memberName}`}
								className="rounded-md border bg-background px-2 py-1 text-xs cursor-pointer"
							>
								{INTERVIEW_ROLES.map((role) => (
									<option key={role} value={role}>
										{INTERVIEW_ROLE_LABELS[role]}
									</option>
								))}
							</select>
							<button
								type="button"
								onClick={() => removeBrother(a.memberEmail)}
								className="text-muted-foreground hover:text-destructive cursor-pointer"
							>
								Remove
							</button>
						</li>
					))}
				</ul>
			)}

			{full ? (
				<p className="text-xs text-muted-foreground">
					{MAX_INTERVIEW_ASSIGNMENTS} brothers assigned — max reached.
				</p>
			) : (
				<div className="flex flex-wrap items-center gap-2">
					<select
						value={pendingEmail}
						onChange={(e) => setPendingEmail(e.target.value)}
						aria-label={`Add a brother to ${candidate.name}'s interview`}
						className="rounded-md border bg-background px-2 py-1 text-xs cursor-pointer"
					>
						<option value="">Add a brother...</option>
						{available.map((b) => (
							<option key={b.email} value={b.email}>
								{b.name}
							</option>
						))}
					</select>
					<select
						value={pendingRole}
						onChange={(e) =>
							setPendingRole(e.target.value as (typeof INTERVIEW_ROLES)[number])
						}
						aria-label="Role for new brother"
						className="rounded-md border bg-background px-2 py-1 text-xs cursor-pointer"
					>
						{INTERVIEW_ROLES.map((role) => (
							<option key={role} value={role}>
								{INTERVIEW_ROLE_LABELS[role]}
							</option>
						))}
					</select>
					<button
						type="button"
						onClick={addBrother}
						disabled={!pendingEmail}
						className="text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline cursor-pointer disabled:cursor-not-allowed"
					>
						Add
					</button>
				</div>
			)}
		</div>
	);
}

/** Groups candidates by scheduled day and lets you set or clear each date. */
export function InterviewSchedule({
	candidates,
	brothers,
	onSchedule,
	onAssign,
}: {
	candidates: BoardCandidate[];
	brothers: BrotherOption[];
	onSchedule: (candidate: BoardCandidate, value: string | null) => void;
	onAssign: (candidate: BoardCandidate, assignments: InterviewAssignment[]) => void;
}) {
	const groups = useMemo(() => {
		const scheduled = candidates.filter((c) => c.scheduledAt);
		const unscheduled = candidates.filter((c) => !c.scheduledAt);

		const byDay = new Map<string, BoardCandidate[]>();
		for (const candidate of scheduled) {
			const day = new Date(candidate.scheduledAt as string).toDateString();
			const bucket = byDay.get(day) ?? [];
			bucket.push(candidate);
			byDay.set(day, bucket);
		}

		const days = Array.from(byDay.entries())
			.map(([day, people]) => ({
				day,
				people: people.sort(
					(a, b) =>
						new Date(a.scheduledAt as string).getTime() -
						new Date(b.scheduledAt as string).getTime(),
				),
			}))
			.sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());

		return { days, unscheduled };
	}, [candidates]);

	/** `datetime-local` needs a local-time string, not an ISO/UTC one. */
	const toInputValue = (iso: string | null) => {
		if (!iso) return "";
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) return "";
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
	};

	const row = (candidate: BoardCandidate) => (
		<div key={candidate.email} className="py-4 first:pt-0 last:pb-0">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3 min-w-0">
					<Headshot name={candidate.name} size={36} />
					<div className="min-w-0">
						<p className="text-sm font-medium truncate">{candidate.name}</p>
						<p className="text-xs text-muted-foreground truncate">
							{INTERVIEW_STAGE_LABELS[candidate.stage]} ·{" "}
							{candidate.interviewCount} filed
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<Input
						type="datetime-local"
						className="h-11 w-full sm:w-56"
						aria-label={`Interview date for ${candidate.name}`}
						value={toInputValue(candidate.scheduledAt)}
						onChange={(e) => onSchedule(candidate, e.target.value || null)}
					/>
					{candidate.scheduledAt && (
						<button
							type="button"
							onClick={() => onSchedule(candidate, null)}
							className="text-xs text-muted-foreground hover:text-destructive cursor-pointer whitespace-nowrap"
						>
							Clear
						</button>
					)}
				</div>
			</div>
			<AssignmentEditor
				candidate={candidate}
				brothers={brothers}
				onChange={(assignments) => onAssign(candidate, assignments)}
			/>
		</div>
	);

	return (
		<div className="space-y-6">
			{groups.days.map(({ day, people }) => (
				<Card key={day}>
					<CardHeader>
						<CardTitle className="text-base">
							{new Date(day).toLocaleDateString([], {
								weekday: "long",
								month: "long",
								day: "numeric",
							})}
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							{people.length} interview{people.length === 1 ? "" : "s"}
						</p>
					</CardHeader>
					<CardContent className="divide-y divide-border">
						{people.map(row)}
					</CardContent>
				</Card>
			))}

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Not scheduled</CardTitle>
					<p className="text-sm text-muted-foreground">
						{groups.unscheduled.length} candidate
						{groups.unscheduled.length === 1 ? "" : "s"} without a date. Pick
						one to put them on the schedule.
					</p>
				</CardHeader>
				<CardContent className="divide-y divide-border">
					{groups.unscheduled.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							Everyone has a date.
						</p>
					) : (
						groups.unscheduled.map(row)
					)}
				</CardContent>
			</Card>
		</div>
	);
}

/** Sidebar list of the signed-in brother's own scheduled assignments. */
export function MyInterviews({
	candidates,
	myEmail,
}: {
	candidates: BoardCandidate[];
	myEmail: string;
}) {
	const mine = useMemo(() => {
		const email = myEmail.toLowerCase();
		return candidates
			.filter(
				(c) =>
					c.scheduledAt &&
					c.assignments.some((a) => a.memberEmail.toLowerCase() === email),
			)
			.sort(
				(a, b) =>
					new Date(a.scheduledAt as string).getTime() -
					new Date(b.scheduledAt as string).getTime(),
			);
	}, [candidates, myEmail]);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">My Interviews</CardTitle>
				<p className="text-sm text-muted-foreground">
					{mine.length === 0
						? "You're not assigned to any scheduled interviews."
						: `${mine.length} upcoming`}
				</p>
			</CardHeader>
			{mine.length > 0 && (
				<CardContent className="divide-y divide-border">
					{mine.map((candidate) => {
						const myRole = candidate.assignments.find(
							(a) => a.memberEmail.toLowerCase() === myEmail.toLowerCase(),
						)?.role;
						return (
							<div
								key={candidate.email}
								className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
							>
								<Headshot name={candidate.name} size={32} />
								<div className="min-w-0">
									<p className="text-sm font-medium truncate">
										{candidate.name}
									</p>
									<p className="text-xs text-muted-foreground truncate">
										{new Date(candidate.scheduledAt as string).toLocaleString(
											[],
											{
												month: "short",
												day: "numeric",
												hour: "numeric",
												minute: "2-digit",
											},
										)}
									</p>
									{myRole && (
										<Badge variant="secondary" className="mt-1">
											{INTERVIEW_ROLE_LABELS[myRole]}
										</Badge>
									)}
								</div>
							</div>
						);
					})}
				</CardContent>
			)}
		</Card>
	);
}
