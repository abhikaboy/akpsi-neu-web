import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import AdminGate from "../components/admin/AdminGate";
import DataTable, { type DataColumn } from "../components/admin/DataTable";
import {
	findImageAnswer,
	Headshot,
	isImageUrl,
} from "../components/admin/Headshot";
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
import {
	fetchApplications,
	type ApplicationRecord,
} from "../lib/adminApplications";

export const Route = createFileRoute("/admin/applications")({
	component: AdminApplications,
});

const ALL = "__all__";

function matchesSearch(app: ApplicationRecord, query: string): boolean {
	if (!query) return true;
	const haystack = [
		app.name,
		app.email,
		app.cycle,
		app.status,
		...app.answers.map((a) => a.value),
	]
		.join(" ")
		.toLowerCase();
	return haystack.includes(query.toLowerCase());
}

function formatDate(value: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

const FILE_URL_RE = /^https?:\/\/.*\.(pdf|jpe?g|png|webp|gif)$/i;

function findHeadshot(app: ApplicationRecord): string | undefined {
	return findImageAnswer(app.answers);
}

function AdminApplications() {
	return <AdminGate>{() => <ApplicationsDashboard />}</AdminGate>;
}

function ApplicationsDashboard() {
	const [applications, setApplications] = useState<ApplicationRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [view, setView] = useState<"table" | "gallery">("table");
	const [statusFilter, setStatusFilter] = useState(ALL);

	const {
		cycle,
		label: cycleLabel,
		loading: cycleLoading,
		error: cycleError,
	} = useActiveCycle();

	useEffect(() => {
		if (cycleLoading) return;
		if (!cycle) {
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		fetchApplications(cycle)
			.then(setApplications)
			.catch((err) => {
				if (err instanceof Error && err.message === "unauthenticated") {
					window.location.reload();
					return;
				}
				setError(
					err instanceof Error ? err.message : "Failed to load applications.",
				);
			})
			.finally(() => setLoading(false));
	}, [cycle, cycleLoading]);

	const answerLabels = useMemo(() => {
		const labels: string[] = [];
		for (const app of applications) {
			for (const answer of app.answers) {
				if (!labels.includes(answer.label)) labels.push(answer.label);
			}
		}
		return labels;
	}, [applications]);

	const statuses = useMemo(
		() => Array.from(new Set(applications.map((app) => app.status))).sort(),
		[applications],
	);

	const filtered = useMemo(
		() =>
			applications.filter(
				(app) =>
					matchesSearch(app, search) &&
					(statusFilter === ALL || app.status === statusFilter),
			),
		[applications, search, statusFilter],
	);

	const hasHeadshots = useMemo(
		() => applications.some((app) => findHeadshot(app)),
		[applications],
	);

	const columns: DataColumn<ApplicationRecord>[] = useMemo(
		() => [
			...(hasHeadshots
				? [
						{
							key: "headshot",
							label: "Photo",
							width: 72,
							render: (app: ApplicationRecord) => findHeadshot(app) ?? "",
							renderCell: (app: ApplicationRecord) => {
								const src = findHeadshot(app);
								return src ? <Headshot src={src} size={40} /> : null;
							},
							sortValue: () => 0,
						},
					]
				: []),
			{
				key: "submittedAt",
				label: "Submitted",
				render: (app) => formatDate(app.submittedAt),
				sortValue: (app) => new Date(app.submittedAt).getTime(),
			},
			{
				key: "name",
				label: "Name",
				render: (app) => app.name,
				sortValue: (app) => app.name,
			},
			{
				key: "email",
				label: "Email",
				render: (app) => app.email,
				sortValue: (app) => app.email,
			},
			{
				key: "status",
				label: "Status",
				render: (app) => app.status,
				sortValue: (app) => app.status,
			},
			...answerLabels.map((label) => ({
				key: `answer:${label}`,
				label,
				render: (app: ApplicationRecord) =>
					app.answers.find((a) => a.label === label)?.value ?? "",
				renderCell: (app: ApplicationRecord) => {
					const value = app.answers.find((a) => a.label === label)?.value ?? "";
					if (isImageUrl(value)) {
						return (
							<a href={value} target="_blank" rel="noreferrer">
								<Headshot src={value} size={32} />
							</a>
						);
					}
					if (FILE_URL_RE.test(value)) {
						return (
							<a
								href={value}
								target="_blank"
								rel="noreferrer"
								className="text-primary underline"
							>
								View file
							</a>
						);
					}
					return <span className="block truncate">{value}</span>;
				},
				sortValue: (app: ApplicationRecord) =>
					app.answers.find((a) => a.label === label)?.value ?? "",
			})),
		],
		[answerLabels],
	);

	return (
		<div className="w-full">
			<div className="flex flex-wrap items-center justify-between gap-4 mb-6">
				<div>
					<div className="flex flex-wrap items-center gap-2 mb-1">
						<h1 className="text-2xl sm:text-3xl font-bold">Applications</h1>
						{cycleLabel && <Badge variant="secondary">{cycleLabel}</Badge>}
					</div>
					<p className="text-muted-foreground text-sm">
						{filtered.length} of {applications.length} submission
						{applications.length === 1 ? "" : "s"}
					</p>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-3 mb-6">
				<Input
					placeholder="Search by name, email, or answer..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="max-w-sm"
				/>

				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-44">
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

				<div className="flex rounded-md border overflow-hidden ml-auto">
					<button
						type="button"
						onClick={() => setView("table")}
						className={`px-3 py-1.5 text-sm cursor-pointer ${view === "table" ? "bg-primary text-primary-foreground" : "bg-background"}`}
					>
						Table
					</button>
					<button
						type="button"
						onClick={() => setView("gallery")}
						className={`px-3 py-1.5 text-sm cursor-pointer ${view === "gallery" ? "bg-primary text-primary-foreground" : "bg-background"}`}
					>
						Gallery
					</button>
				</div>
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
			) : filtered.length === 0 ? (
				<p className="text-muted-foreground text-sm border rounded-lg p-6">
					No applications match your filters.
				</p>
			) : view === "table" ? (
				<DataTable
					rows={filtered}
					columns={columns}
					rowKey={(app) => app._id}
					initialSort={{ key: "submittedAt", dir: "desc" }}
				/>
			) : (
				<ApplicationsGallery applications={filtered} />
			)}
		</div>
	);
}

function ApplicationsGallery({
	applications,
}: { applications: ApplicationRecord[] }) {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
			{applications.map((app) => {
				const headshot = findHeadshot(app);
				return (
					<Card key={app._id}>
						<CardHeader>
							<div className="flex items-start gap-3">
								{headshot && <Headshot src={headshot} size={48} />}
								<div className="flex-1 min-w-0">
									<div className="flex items-start justify-between gap-2">
										<CardTitle>{app.name}</CardTitle>
									</div>
									<p className="text-sm text-muted-foreground">{app.email}</p>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-3">
							<p className="text-xs text-muted-foreground">
								Submitted {formatDate(app.submittedAt)} &middot; {app.status}
							</p>
							<div className="space-y-2">
								{app.answers.map((answer) => (
									<div key={answer.label}>
										<p className="text-xs font-semibold text-muted-foreground">
											{answer.label}
										</p>
										{isImageUrl(answer.value) ? (
											<a href={answer.value} target="_blank" rel="noreferrer">
												<img
													src={answer.value}
													alt={answer.label}
													className="mt-1 max-h-40 rounded border object-cover"
												/>
											</a>
										) : FILE_URL_RE.test(answer.value) ? (
											<a
												href={answer.value}
												target="_blank"
												rel="noreferrer"
												className="text-sm text-primary underline break-all"
											>
												View file
											</a>
										) : (
											<p className="text-sm break-words">
												{answer.value || "—"}
											</p>
										)}
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}

export default AdminApplications;
