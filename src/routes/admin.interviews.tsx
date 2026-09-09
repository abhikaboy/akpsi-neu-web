import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import AdminGate from "../components/admin/AdminGate";
import EvalForm from "../components/admin/EvalForm";
import {
	InterviewBoard,
	InterviewSchedule,
	MyInterviews,
	useBoardData,
} from "../components/admin/InterviewBoard";
import InterviewResults from "../components/admin/InterviewResults";
import { Badge } from "../components/ui/badge";
import { useActiveCycle } from "../lib/activeCycle";
import { fetchEvaluations, type EvaluationRecord } from "../lib/adminEvals";
import { getMembers, urlFor, type Member } from "../lib/sanity";

export const Route = createFileRoute("/admin/interviews")({
	component: AdminInterviews,
});

const TABS = [
	{ id: "submit", label: "Submit" },
	{ id: "results", label: "Results" },
	{ id: "board", label: "Board" },
	{ id: "schedule", label: "Schedule" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function AdminInterviews() {
	return (
		<AdminGate>{(user) => <Interviews userEmail={user.email} />}</AdminGate>
	);
}

function Interviews({ userEmail }: { userEmail: string }) {
	const [tab, setTab] = useState<TabId>("submit");
	const {
		cycle,
		label: cycleLabel,
		loading: cycleLoading,
		error: cycleError,
	} = useActiveCycle();

	const board = useBoardData(cycle, cycleLoading);

	const [members, setMembers] = useState<Member[]>([]);
	useEffect(() => {
		getMembers()
			.then(setMembers)
			.catch(() => setMembers([]));
	}, []);
	const brothers = useMemo(
		() =>
			members.map((m) => ({
				name: m.name,
				email: m.email,
				pictureUrl: m.picture
					? urlFor(m.picture).width(64).height(64).fit("crop").url()
					: null,
			})),
		[members],
	);

	const [interviews, setInterviews] = useState<EvaluationRecord[]>([]);
	const [resultsLoading, setResultsLoading] = useState(true);
	const [resultsError, setResultsError] = useState<string | null>(null);

	useEffect(() => {
		if (cycleLoading) return;
		if (!cycle) {
			setResultsLoading(false);
			return;
		}
		setResultsLoading(true);
		setResultsError(null);
		fetchEvaluations({ cycle, formType: "interview" })
			.then(setInterviews)
			.catch((err) => {
				if (err instanceof Error && err.message === "unauthenticated") {
					window.location.reload();
					return;
				}
				setResultsError(
					err instanceof Error ? err.message : "Failed to load interviews.",
				);
			})
			.finally(() => setResultsLoading(false));
	}, [cycle, cycleLoading]);

	const busy = tab === "results" ? resultsLoading : board.loading;
	const problem =
		cycleError ?? (tab === "results" ? resultsError : board.error);

	return (
		<div className="w-full">
			<div className="mb-6">
				<div className="flex flex-wrap items-center gap-2 mb-1">
					<h1 className="text-2xl sm:text-3xl font-bold">Interviews</h1>
					{cycleLabel && <Badge variant="secondary">{cycleLabel}</Badge>}
				</div>
				<p className="text-muted-foreground text-sm">
					Submit interviews, read what everyone recorded, and track where each
					candidate is in the pipeline.
				</p>
			</div>

			{/* Scrolls horizontally rather than wrapping on a narrow screen. */}
			<div
				role="tablist"
				aria-label="Interview views"
				className="flex gap-1 mb-6 overflow-x-auto border-b"
			>
				{TABS.map((item) => (
					<button
						key={item.id}
						type="button"
						role="tab"
						aria-selected={tab === item.id}
						onClick={() => setTab(item.id)}
						className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors ${
							tab === item.id
								? "border-primary text-foreground"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						{item.label}
					</button>
				))}
			</div>

			{problem && tab !== "submit" && (
				<div className="p-4 mb-6 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
					{problem}
				</div>
			)}

			{tab === "submit" ? (
				// The form owns its own loading and error handling.
				<EvalForm
					formType="interview"
					title="Submit an Interview"
					description="Work through the core questions, add any rotating questions you asked, and record their answers. Saved under your name and editable any time."
					evaluatorEmail={userEmail}
					allowExtraQuestions
					onSessionExpired={() => window.location.reload()}
				/>
			) : !cycle && !cycleLoading ? (
				<p className="text-muted-foreground text-sm border rounded-lg p-6">
					No active cycle is set. An admin needs to choose one in Sanity Studio
					under “Chapter Settings”.
				</p>
			) : busy ? (
				<div className="space-y-3">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className="skeleton h-20 rounded" />
					))}
				</div>
			) : tab === "results" ? (
				<InterviewResults evaluations={interviews} />
			) : tab === "board" ? (
				<InterviewBoard
					candidates={board.candidates}
					onMove={(candidate, stage) => board.update(candidate, { stage })}
				/>
			) : (
				<div className="grid gap-6 lg:grid-cols-[280px_1fr]">
					<div className="lg:sticky lg:top-6 lg:self-start">
						<MyInterviews candidates={board.candidates} myEmail={userEmail} />
					</div>
					<InterviewSchedule
						candidates={board.candidates}
						brothers={brothers}
						onSchedule={(candidate, value) =>
							board.update(candidate, {
								scheduledAt: value ? new Date(value).toISOString() : null,
							})
						}
						onAssign={(candidate, assignments) =>
							board.update(candidate, { assignments })
						}
					/>
				</div>
			)}
		</div>
	);
}

export default AdminInterviews;
