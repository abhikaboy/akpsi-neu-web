import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AdminGate from "../components/admin/AdminGate";
import CandidateDetail, {
	CandidateScoreStrip,
	candidatePhoto,
	FORM_ORDER,
	FORM_LABELS,
} from "../components/admin/CandidateDetail";
import { Headshot } from "../components/admin/Headshot";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
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
import { Separator } from "../components/ui/separator";
import { useActiveCycle } from "../lib/activeCycle";
import { fetchDeliberation, type DeliberationProfile } from "../lib/adminEvals";
import type { EvalFormType } from "../lib/sanity";

export const Route = createFileRoute("/admin/deliberate")({
	component: AdminDeliberate,
});

const ALL = "__all__";

type SortKey =
	| "overallScore"
	| "name"
	| "totalEvaluations"
	| "submittedAt"
	| EvalFormType;

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
	{ value: "overallScore", label: "Overall score" },
	{ value: "name", label: "Name" },
	{ value: "totalEvaluations", label: "Number of evals" },
	{ value: "submittedAt", label: "Application date" },
	...FORM_ORDER.map((formType) => ({
		value: formType as SortKey,
		label: `${FORM_LABELS[formType]} score`,
	})),
];

/**
 * "Did I evaluate this person?" filters. `mine`/`not-mine` ignore the form, and
 * the per-form variants answer "who have I still not filed a rush eval on?".
 */
type MineFilter =
	| "any"
	| "mine"
	| "not-mine"
	| `mine:${EvalFormType}`
	| `not-mine:${EvalFormType}`;

const MINE_OPTIONS: { value: MineFilter; label: string }[] = [
	{ value: "any", label: "Anyone" },
	{ value: "mine", label: "I evaluated (any form)" },
	{ value: "not-mine", label: "I haven't evaluated" },
	...FORM_ORDER.flatMap((formType) => [
		{
			value: `mine:${formType}` as MineFilter,
			label: `I filed a ${FORM_LABELS[formType].toLowerCase()}`,
		},
		{
			value: `not-mine:${formType}` as MineFilter,
			label: `I owe a ${FORM_LABELS[formType].toLowerCase()}`,
		},
	]),
];

/** Coverage filters answer "who still needs to be seen?" during deliberations. */
type CoverageFilter = "any" | "complete" | `missing:${EvalFormType}`;

const COVERAGE_OPTIONS: { value: CoverageFilter; label: string }[] = [
	{ value: "any", label: "Any coverage" },
	{ value: "complete", label: "Evaluated on every form" },
	...FORM_ORDER.map((formType) => ({
		value: `missing:${formType}` as CoverageFilter,
		label: `Missing ${FORM_LABELS[formType].toLowerCase()}`,
	})),
];

const MIN_SCORE_OPTIONS = [0, 50, 60, 70, 80, 90];

/** Sortable value for a profile, with nulls pushed to the bottom either way. */
function sortValue(
	profile: DeliberationProfile,
	key: SortKey,
): number | string {
	switch (key) {
		case "name":
			return profile.name.toLowerCase();
		case "totalEvaluations":
			return profile.totalEvaluations;
		case "submittedAt": {
			const raw = profile.application?.submittedAt;
			return raw ? new Date(raw).getTime() : Number.NEGATIVE_INFINITY;
		}
		case "overallScore":
			return profile.overallScore ?? Number.NEGATIVE_INFINITY;
		default:
			return profile.summary?.[key]?.averageScore ?? Number.NEGATIVE_INFINITY;
	}
}

function AdminDeliberate() {
	return <AdminGate>{(user) => <Deliberation viewerEmail={user.email} />}</AdminGate>;
}

/**
 * Read-only consolidated view: one expandable row per rushee carrying their
 * application answers alongside every eval and interview we hold on them, so
 * deliberations don't need five tabs open.
 */
function Deliberation({ viewerEmail }: { viewerEmail: string }) {
	const {
		cycle,
		label: cycleLabel,
		loading: cycleLoading,
		error: cycleError,
	} = useActiveCycle();

	const [profiles, setProfiles] = useState<DeliberationProfile[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [search, setSearch] = useState("");
	const [sortKey, setSortKey] = useState<SortKey>("overallScore");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
	const [statusFilter, setStatusFilter] = useState(ALL);
	const [applicationFilter, setApplicationFilter] = useState(ALL);
	const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>("any");
	const [mineFilter, setMineFilter] = useState<MineFilter>("any");
	const [minScore, setMinScore] = useState(0);
	const [expanded, setExpanded] = useState<string | null>(null);

	useEffect(() => {
		if (cycleLoading) return;
		if (!cycle) {
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		fetchDeliberation(cycle)
			.then(setProfiles)
			.catch((err) => {
				if (err instanceof Error && err.message === "unauthenticated") {
					window.location.reload();
					return;
				}
				setError(
					err instanceof Error
						? err.message
						: "Failed to load deliberation data.",
				);
			})
			.finally(() => setLoading(false));
	}, [cycle, cycleLoading]);

	const statuses = useMemo(
		() =>
			Array.from(
				new Set(
					profiles
						.map((profile) => profile.application?.status)
						.filter((status): status is string => Boolean(status)),
				),
			).sort(),
		[profiles],
	);

	const filtered = useMemo(() => {
		const query = search.trim().toLowerCase();
		return profiles.filter((profile) => {
			if (
				query &&
				!`${profile.name} ${profile.email}`.toLowerCase().includes(query)
			) {
				return false;
			}
			if (applicationFilter === "yes" && !profile.application) return false;
			if (applicationFilter === "no" && profile.application) return false;
			if (
				statusFilter !== ALL &&
				profile.application?.status !== statusFilter
			) {
				return false;
			}
			if (minScore > 0 && (profile.overallScore ?? -1) < minScore) return false;

			if (mineFilter !== "any") {
				const mine = profile.myFormTypes ?? [];
				if (mineFilter === "mine" && mine.length === 0) return false;
				if (mineFilter === "not-mine" && mine.length > 0) return false;
				if (mineFilter.startsWith("mine:")) {
					const formType = mineFilter.slice("mine:".length) as EvalFormType;
					if (!mine.includes(formType)) return false;
				}
				if (mineFilter.startsWith("not-mine:")) {
					const formType = mineFilter.slice("not-mine:".length) as EvalFormType;
					if (mine.includes(formType)) return false;
				}
			}

			if (coverageFilter === "complete") {
				return FORM_ORDER.every(
					(formType) => (profile.summary?.[formType]?.count ?? 0) > 0,
				);
			}
			if (coverageFilter.startsWith("missing:")) {
				const formType = coverageFilter.slice(
					"missing:".length,
				) as EvalFormType;
				return (profile.summary?.[formType]?.count ?? 0) === 0;
			}
			return true;
		});
	}, [
		profiles,
		search,
		applicationFilter,
		statusFilter,
		minScore,
		coverageFilter,
		mineFilter,
	]);

	const sorted = useMemo(() => {
		const copy = [...filtered];
		copy.sort((a, b) => {
			const av = sortValue(a, sortKey);
			const bv = sortValue(b, sortKey);
			const cmp =
				typeof av === "number" && typeof bv === "number"
					? av - bv
					: String(av).localeCompare(String(bv));
			// A tie on any metric falls back to name so the order is stable.
			if (cmp === 0) return a.name.localeCompare(b.name);
			return sortDir === "asc" ? cmp : -cmp;
		});
		return copy;
	}, [filtered, sortKey, sortDir]);

	const resetFilters = () => {
		setSearch("");
		setStatusFilter(ALL);
		setApplicationFilter(ALL);
		setCoverageFilter("any");
		setMineFilter("any");
		setMinScore(0);
	};

	const filtersActive =
		Boolean(search) ||
		statusFilter !== ALL ||
		applicationFilter !== ALL ||
		coverageFilter !== "any" ||
		mineFilter !== "any" ||
		minScore > 0;

	return (
		<div className="w-full">
			<div className="mb-6">
				<div className="flex flex-wrap items-center gap-2 mb-1">
					<h1 className="text-2xl sm:text-3xl font-bold">Deliberate</h1>
					{cycleLabel && <Badge variant="secondary">{cycleLabel}</Badge>}
				</div>
				<p className="text-muted-foreground text-sm">
					{sorted.length} of {profiles.length} rushee
					{profiles.length === 1 ? "" : "s"}. Click a row for the full profile.
				</p>
			</div>

			<div className="flex flex-wrap items-center gap-3 mb-6">
				<Input
					placeholder="Search by name or email..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="max-w-xs"
				/>

				<div className="flex items-center gap-1">
					<Select
						value={sortKey}
						onValueChange={(value) => setSortKey(value as SortKey)}
					>
						<SelectTrigger className="w-52">
							<SelectValue placeholder="Sort by" />
						</SelectTrigger>
						<SelectContent>
							{SORT_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									Sort: {option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button
						type="button"
						variant="outline"
						size="icon"
						aria-label={
							sortDir === "asc" ? "Sort descending" : "Sort ascending"
						}
						onClick={() =>
							setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
						}
					>
						{sortDir === "asc" ? (
							<ArrowUp className="size-4" />
						) : (
							<ArrowDown className="size-4" />
						)}
					</Button>
				</div>

				<Select
					value={coverageFilter}
					onValueChange={(value) => setCoverageFilter(value as CoverageFilter)}
				>
					<SelectTrigger className="w-56">
						<SelectValue placeholder="Coverage" />
					</SelectTrigger>
					<SelectContent>
						{COVERAGE_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select
					value={mineFilter}
					onValueChange={(value) => setMineFilter(value as MineFilter)}
				>
					<SelectTrigger className="w-56">
						<SelectValue placeholder="My evals" />
					</SelectTrigger>
					<SelectContent>
						{MINE_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select
					value={String(minScore)}
					onValueChange={(value) => setMinScore(Number(value))}
				>
					<SelectTrigger className="w-44">
						<SelectValue placeholder="Minimum score" />
					</SelectTrigger>
					<SelectContent>
						{MIN_SCORE_OPTIONS.map((score) => (
							<SelectItem key={score} value={String(score)}>
								{score === 0 ? "Any score" : `Score ≥ ${score}%`}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select value={applicationFilter} onValueChange={setApplicationFilter}>
					<SelectTrigger className="w-44">
						<SelectValue placeholder="Application" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL}>Applied or not</SelectItem>
						<SelectItem value="yes">Has application</SelectItem>
						<SelectItem value="no">No application</SelectItem>
					</SelectContent>
				</Select>

				{statuses.length > 0 && (
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-40">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ALL}>All statuses</SelectItem>
							{statuses.map((status) => (
								<SelectItem key={status} value={status}>
									{status}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}

				{filtersActive && (
					<Button type="button" variant="ghost" onClick={resetFilters}>
						Clear filters
					</Button>
				)}
			</div>

			{(cycleError ?? error) && (
				<div className="p-3 mb-6 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
					{cycleError ?? error}
				</div>
			)}

			{loading ? (
				<div className="space-y-3">
					{Array.from({ length: 5 }).map((_, i) => (
						<div key={i} className="skeleton h-20 rounded" />
					))}
				</div>
			) : !cycle ? (
				<p className="text-muted-foreground text-sm border rounded-lg p-6">
					No active cycle is set. An admin needs to choose one in Sanity Studio
					under “Chapter Settings”.
				</p>
			) : sorted.length === 0 ? (
				<p className="text-muted-foreground text-sm border rounded-lg p-6">
					No rushees match your filters.
				</p>
			) : (
				<div className="space-y-3">
					{sorted.map((profile) => (
						<ProfileRow
							key={profile.email}
							profile={profile}
							cycle={cycle ?? ""}
							viewerEmail={viewerEmail}
							open={expanded === profile.email}
							onToggle={() =>
								setExpanded((prev) =>
									prev === profile.email ? null : profile.email,
								)
							}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function ProfileRow({
	profile,
	cycle,
	viewerEmail,
	open,
	onToggle,
}: {
	profile: DeliberationProfile;
	cycle: string;
	viewerEmail: string;
	open: boolean;
	onToggle: () => void;
}) {
	const Chevron = open ? ChevronDown : ChevronRight;
	const photo = candidatePhoto(profile);

	return (
		<Card>
			<CardHeader>
				<div className="flex w-full items-start gap-3">
					<button
						type="button"
						onClick={onToggle}
						aria-expanded={open}
						className="mt-2.5 cursor-pointer"
					>
						<Chevron className="size-5 shrink-0 text-muted-foreground" />
					</button>

					<Link
						to="/admin/candidate/$email"
						params={{ email: encodeURIComponent(profile.email) }}
						className="group flex min-w-0 flex-1 items-start gap-3 text-left"
					>
						<Headshot src={photo} name={profile.name} size={44} />
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-2">
								<CardTitle className="truncate group-hover:underline">
									{profile.name}
								</CardTitle>
								{profile.application ? (
									<Badge variant="outline">{profile.application.status}</Badge>
								) : (
									<Badge variant="outline">No application</Badge>
								)}
							</div>
							<p className="text-sm text-muted-foreground truncate">
								{profile.email}
							</p>
						</div>
					</Link>

					<button
						type="button"
						onClick={onToggle}
						aria-expanded={open}
						className="text-right shrink-0 cursor-pointer"
					>
						<p className="text-xs text-muted-foreground">
							{profile.totalEvaluations} eval
							{profile.totalEvaluations === 1 ? "" : "s"}
						</p>
					</button>
				</div>

				<div className="pt-2 pl-[4.75rem]">
					<CandidateScoreStrip profile={profile} />
				</div>
			</CardHeader>

			{open && (
				<CardContent className="space-y-6">
					<Separator />
					<CandidateDetail
						profile={profile}
						cycle={cycle}
						viewerEmail={viewerEmail}
					/>
				</CardContent>
			)}
		</Card>
	);
}

export default AdminDeliberate;
