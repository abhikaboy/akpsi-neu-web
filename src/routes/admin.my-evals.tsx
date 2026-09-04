import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import AdminGate from "../components/admin/AdminGate";
import DataTable, { type DataColumn } from "../components/admin/DataTable";
import { Badge } from "../components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../components/ui/select";
import { useActiveCycle } from "../lib/activeCycle";
import { fetchEvaluations, type EvaluationRecord } from "../lib/adminEvals";
import type { EvalFormType } from "../lib/sanity";

export const Route = createFileRoute("/admin/my-evals")({
	component: AdminMyEvals,
});

const ALL = "__all__";

const FORM_ORDER: EvalFormType[] = [
	"rushEval",
	"invitationalEval",
	"interview",
];
const FORM_LABELS: Record<EvalFormType, string> = {
	rushEval: "Rush Eval",
	invitationalEval: "Invitational Eval",
	interview: "Interview",
};
const FORM_PATHS: Record<EvalFormType, string> = {
	rushEval: "/admin/rush-evals",
	invitationalEval: "/admin/invitational-evals",
	interview: "/admin/interviews",
};

function formatDate(value: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function AdminMyEvals() {
	return (
		<AdminGate>{(user) => <MyEvals evaluatorName={user.name} />}</AdminGate>
	);
}

/**
 * Everything the signed-in brother has submitted this cycle. Separate from the
 * Evals Sheet (which is every brother's) so you can check your own coverage and
 * find an eval you want to revise.
 */
function MyEvals({ evaluatorName }: { evaluatorName: string }) {
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
	const [formFilter, setFormFilter] = useState<string>(ALL);

	useEffect(() => {
		if (cycleLoading) return;
		if (!cycle) {
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		fetchEvaluations({ cycle, mine: true })
			.then(setEvaluations)
			.catch((err) => {
				if (err instanceof Error && err.message === "unauthenticated") {
					window.location.reload();
					return;
				}
				setError(
					err instanceof Error
						? err.message
						: "Failed to load your evaluations.",
				);
			})
			.finally(() => setLoading(false));
	}, [cycle, cycleLoading]);

	const countsByForm = useMemo(() => {
		const counts = {} as Record<EvalFormType, number>;
		for (const formType of FORM_ORDER) {
			counts[formType] = evaluations.filter(
				(e) => e.formType === formType,
			).length;
		}
		return counts;
	}, [evaluations]);

	const filtered = useMemo(() => {
		const query = search.trim().toLowerCase();
		return evaluations.filter((e) => {
			if (formFilter !== ALL && e.formType !== formFilter) return false;
			if (!query) return true;
			const haystack = [
				e.applicantName,
				e.applicantEmail,
				...e.responses.map((r) => r.value),
			]
				.join(" ")
				.toLowerCase();
			return haystack.includes(query);
		});
	}, [evaluations, search, formFilter]);

	// Criterion columns come from the rows on screen, so a rubric change in
	// Sanity shows up without a code change.
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
				key: "formType",
				label: "Form",
				render: (e) => FORM_LABELS[e.formType] ?? e.formType,
				sortValue: (e) => e.formType,
				width: 150,
			},
			{
				key: "applicantName",
				label: "Rushee",
				render: (e) => e.applicantName,
				sortValue: (e) => e.applicantName,
			},
			{
				key: "applicantEmail",
				label: "Rushee Email",
				render: (e) => e.applicantEmail,
				sortValue: (e) => e.applicantEmail,
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
					<h1 className="text-2xl sm:text-3xl font-bold">My Evals</h1>
					{cycleLabel && <Badge variant="secondary">{cycleLabel}</Badge>}
				</div>
				<p className="text-muted-foreground text-sm">
					{filtered.length} of {evaluations.length} evaluation
					{evaluations.length === 1 ? "" : "s"} submitted by {evaluatorName}.
				</p>
			</div>

			<div className="grid gap-3 sm:grid-cols-3 mb-6">
				{FORM_ORDER.map((formType) => (
					<Card key={formType}>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								{FORM_LABELS[formType]}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-2xl font-bold leading-none">
								{countsByForm[formType]}
							</p>
							<Link
								to={FORM_PATHS[formType]}
								className="text-xs text-primary underline mt-2 inline-block"
							>
								Submit another
							</Link>
						</CardContent>
					</Card>
				))}
			</div>

			<div className="flex flex-wrap items-center gap-3 mb-6">
				<Input
					placeholder="Search by rushee or answer..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="max-w-sm"
				/>

				<Select value={formFilter} onValueChange={setFormFilter}>
					<SelectTrigger className="w-52">
						<SelectValue placeholder="Form" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL}>All forms</SelectItem>
						{FORM_ORDER.map((formType) => (
							<SelectItem key={formType} value={formType}>
								{FORM_LABELS[formType]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{(cycleError ?? error) && (
				<div className="p-3 mb-6 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
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
			) : evaluations.length === 0 ? (
				<p className="text-muted-foreground text-sm border rounded-lg p-6">
					You haven't submitted any evaluations for this cycle yet.
				</p>
			) : filtered.length === 0 ? (
				<p className="text-muted-foreground text-sm border rounded-lg p-6">
					None of your evaluations match your filters.
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

export default AdminMyEvals;
