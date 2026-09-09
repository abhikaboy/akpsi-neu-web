import { useEffect, useMemo, useState } from "react";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { useActiveCycle } from "../../lib/activeCycle";
import { fetchEvaluations, type EvaluationRecord } from "../../lib/adminEvals";
import type { EvalFormType } from "../../lib/sanity";
import DataTable, { type DataColumn } from "./DataTable";
import RusheeLink from "./RusheeLink";

function formatDate(value: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

interface EvalsSheetProps {
	/**
	 * Exactly one form per sheet. Rush and invitational evals use different
	 * rubrics, so mixing them produced a table that was mostly empty cells —
	 * and interviews, being all long-answer, don't belong in a sheet at all.
	 */
	formType: Exclude<EvalFormType, "interview">;
	title: string;
	description: string;
}

/** Spreadsheet view of one eval type: a row per submission, a column per criterion. */
export default function EvalsSheet({
	formType,
	title,
	description,
}: EvalsSheetProps) {
	const {
		cycle,
		label: cycleLabel,
		loading: cycleLoading,
		error: cycleError,
	} = useActiveCycle();

	const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");

	useEffect(() => {
		if (cycleLoading) return;
		if (!cycle) {
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		fetchEvaluations({ cycle, formType })
			.then(setEvaluations)
			.catch((err) => {
				if (err instanceof Error && err.message === "unauthenticated") {
					window.location.reload();
					return;
				}
				setError(
					err instanceof Error ? err.message : "Failed to load evaluations.",
				);
			})
			.finally(() => setLoading(false));
	}, [cycle, cycleLoading, formType]);

	const filtered = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return evaluations;
		return evaluations.filter((e) =>
			[
				e.applicantName,
				e.applicantEmail,
				e.evaluatorName,
				...e.responses.map((r) => r.value),
			]
				.join(" ")
				.toLowerCase()
				.includes(query),
		);
	}, [evaluations, search]);

	// Criterion columns are derived from the rows on screen, so a rubric change
	// in Sanity shows up here without any code change.
	const criterionLabels = useMemo(() => {
		const labels: string[] = [];
		for (const evaluation of filtered) {
			for (const response of evaluation.responses) {
				if (!labels.includes(response.label)) labels.push(response.label);
			}
		}
		return labels;
	}, [filtered]);

	const columns: DataColumn<EvaluationRecord>[] = useMemo(
		() => [
			{
				key: "submittedAt",
				label: "Submitted",
				render: (e) => formatDate(e.submittedAt),
				sortValue: (e) => new Date(e.submittedAt).getTime(),
			},
			{
				key: "applicantName",
				label: "Rushee",
				render: (e) => e.applicantName,
				renderCell: (e) => (
					<RusheeLink name={e.applicantName} email={e.applicantEmail} />
				),
				sortValue: (e) => e.applicantName,
			},
			{
				key: "applicantEmail",
				label: "Rushee Email",
				render: (e) => e.applicantEmail,
				sortValue: (e) => e.applicantEmail,
			},
			{
				key: "evaluatorName",
				label: "Evaluator",
				render: (e) => e.evaluatorName,
				sortValue: (e) => e.evaluatorName,
			},
			{
				key: "normalizedScore",
				label: "Score %",
				render: (e) =>
					e.normalizedScore === null ? "—" : `${e.normalizedScore}%`,
				sortValue: (e) => e.normalizedScore ?? -1,
				width: 110,
			},
			{
				key: "rawAverage",
				label: "Raw Avg",
				render: (e) => (e.rawAverage === null ? "—" : String(e.rawAverage)),
				sortValue: (e) => e.rawAverage ?? -1,
				width: 110,
			},
			...criterionLabels.map((label) => ({
				key: `criterion:${label}`,
				label,
				render: (e: EvaluationRecord) =>
					e.responses.find((r) => r.label === label)?.value ?? "",
				sortValue: (e: EvaluationRecord) => {
					const response = e.responses.find((r) => r.label === label);
					if (!response) return "";
					return response.score ?? response.value;
				},
			})),
		],
		[criterionLabels],
	);

	return (
		<div className="w-full">
			<div className="mb-6">
				<div className="flex flex-wrap items-center gap-2 mb-1">
					<h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
					{cycleLabel && <Badge variant="secondary">{cycleLabel}</Badge>}
				</div>
				<p className="text-muted-foreground text-sm">
					{description} {filtered.length} of {evaluations.length} evaluation
					{evaluations.length === 1 ? "" : "s"}.
				</p>
			</div>

			<div className="flex flex-wrap items-center gap-3 mb-6">
				<Input
					placeholder="Search by rushee, evaluator, or answer..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="max-w-sm"
				/>
			</div>

			{(cycleError ?? error) && (
				<div className="p-4 mb-6 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
					{cycleError ?? error}
				</div>
			)}

			{loading ? (
				<div className="space-y-3">
					{Array.from({ length: 5 }).map((_, i) => (
						<div key={i} className="skeleton h-12 rounded" />
					))}
				</div>
			) : !cycle ? (
				<p className="text-muted-foreground text-sm border rounded-lg p-6">
					No active cycle is set. An admin needs to choose one in Sanity Studio
					under “Chapter Settings”.
				</p>
			) : filtered.length === 0 ? (
				<p className="text-muted-foreground text-sm border rounded-lg p-6">
					{evaluations.length === 0
						? "No evaluations have been submitted for this cycle yet."
						: "No evaluations match your search."}
				</p>
			) : (
				<DataTable
					rows={filtered}
					columns={columns}
					rowKey={(e) => e._id}
					initialSort={{ key: "submittedAt", dir: "desc" }}
				/>
			)}
		</div>
	);
}
