import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AdminGate from "../components/admin/AdminGate";
import CandidateDetail, {
	candidatePhoto,
} from "../components/admin/CandidateDetail";
import { Headshot } from "../components/admin/Headshot";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "../components/ui/popover";
import { Input } from "../components/ui/input";
import { useActiveCycle } from "../lib/activeCycle";
import { fetchDeliberation, type DeliberationProfile } from "../lib/adminEvals";

export const Route = createFileRoute("/admin/candidate/$email")({
	component: AdminCandidatePage,
});

function AdminCandidatePage() {
	const { email } = Route.useParams();
	return (
		<AdminGate>
			{(user) => <CandidatePage email={email} viewerEmail={user.email} />}
		</AdminGate>
	);
}

/**
 * Full-page view of a single candidate's deliberation record — same content
 * as the expandable row on /admin/deliberate, but with room to read closely
 * and a switcher to jump straight to the next candidate without going back.
 */
function CandidatePage({
	email,
	viewerEmail,
}: {
	email: string;
	viewerEmail: string;
}) {
	const navigate = useNavigate();
	const { cycle, label: cycleLabel, loading: cycleLoading, error: cycleError } =
		useActiveCycle();

	const [profiles, setProfiles] = useState<DeliberationProfile[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [search, setSearch] = useState("");

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

	const decodedEmail = decodeURIComponent(email).toLowerCase();
	const sortedProfiles = useMemo(
		() => [...profiles].sort((a, b) => a.name.localeCompare(b.name)),
		[profiles],
	);
	const profile = sortedProfiles.find(
		(p) => p.email.toLowerCase() === decodedEmail,
	);

	const filteredProfiles = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return sortedProfiles;
		return sortedProfiles.filter((p) =>
			`${p.name} ${p.email}`.toLowerCase().includes(query),
		);
	}, [sortedProfiles, search]);

	const goToCandidate = (nextEmail: string) => {
		setPickerOpen(false);
		setSearch("");
		navigate({
			to: "/admin/candidate/$email",
			params: { email: encodeURIComponent(nextEmail) },
		});
	};

	return (
		<div className="w-full max-w-5xl mx-auto">
			<div className="flex flex-wrap items-center justify-between gap-3 mb-6">
				<div className="flex items-center gap-2">
					<Button asChild variant="ghost" size="sm">
						<Link to="/admin/deliberate">
							<ArrowLeft className="size-4 mr-1" />
							Back to list
						</Link>
					</Button>
					{cycleLabel && <Badge variant="secondary">{cycleLabel}</Badge>}
				</div>

				<Popover open={pickerOpen} onOpenChange={setPickerOpen}>
					<PopoverTrigger asChild>
						<Button variant="outline" size="sm">
							Jump to candidate
							<ChevronDown className="size-4 ml-1" />
						</Button>
					</PopoverTrigger>
					<PopoverContent align="end" className="w-72 p-2">
						<Input
							autoFocus
							placeholder="Search by name or email..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="mb-2"
						/>
						<div className="max-h-64 overflow-y-auto space-y-0.5">
							{filteredProfiles.length === 0 ? (
								<p className="text-sm text-muted-foreground px-2 py-1.5">
									No matches.
								</p>
							) : (
								filteredProfiles.map((p) => (
									<button
										key={p.email}
										type="button"
										onClick={() => goToCandidate(p.email)}
										className={`w-full text-left text-sm rounded px-2 py-1.5 hover:bg-muted flex items-center justify-between gap-2 ${
											p.email.toLowerCase() === decodedEmail
												? "bg-muted font-medium"
												: ""
										}`}
									>
										<span className="truncate">{p.name}</span>
										<span className="text-xs text-muted-foreground shrink-0">
											{p.overallScore === null ? "—" : `${p.overallScore}%`}
										</span>
									</button>
								))
							)}
						</div>
					</PopoverContent>
				</Popover>
			</div>

			{(cycleError ?? error) && (
				<div className="p-3 mb-6 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
					{cycleError ?? error}
				</div>
			)}

			{loading ? (
				<div className="space-y-3">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className="skeleton h-20 rounded" />
					))}
				</div>
			) : !profile ? (
				<p className="text-muted-foreground text-sm border rounded-lg p-6">
					No candidate found for this email in the active cycle.
				</p>
			) : (
				<Card>
					<CardHeader>
						<div className="flex items-start gap-4">
							<Headshot
								src={candidatePhoto(profile)}
								name={profile.name}
								size={112}
							/>
							<div className="min-w-0 flex-1">
								<div className="flex flex-wrap items-center gap-2">
									<CardTitle className="truncate text-2xl">
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
								<p className="text-xs text-muted-foreground mt-1">
									{profile.totalEvaluations} eval
									{profile.totalEvaluations === 1 ? "" : "s"} on file
								</p>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<CandidateDetail
							profile={profile}
							cycle={cycle ?? ""}
							viewerEmail={viewerEmail}
						/>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

export default AdminCandidatePage;
