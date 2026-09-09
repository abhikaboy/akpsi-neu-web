import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";
import type { EvaluationRecord } from "../../lib/adminEvals";
import { Headshot } from "./Headshot";

/**
 * Interviews are entirely long-form, so they're grouped per candidate with each
 * interviewer's answers read in full — a spreadsheet of prose is unreadable,
 * which is why interviews are deliberately absent from the eval sheets.
 */
export default function InterviewResults({
	evaluations,
}: {
	evaluations: EvaluationRecord[];
}) {
	const [search, setSearch] = useState("");
	const [expanded, setExpanded] = useState<string | null>(null);

	const candidates = useMemo(() => {
		const byEmail = new Map<
			string,
			{ email: string; name: string; interviews: EvaluationRecord[] }
		>();
		for (const evaluation of evaluations) {
			let entry = byEmail.get(evaluation.applicantEmail);
			if (!entry) {
				entry = {
					email: evaluation.applicantEmail,
					name: evaluation.applicantName,
					interviews: [],
				};
				byEmail.set(evaluation.applicantEmail, entry);
			}
			entry.interviews.push(evaluation);
		}
		const query = search.trim().toLowerCase();
		return Array.from(byEmail.values())
			.filter(
				(c) =>
					!query ||
					`${c.name} ${c.email}`.toLowerCase().includes(query) ||
					c.interviews.some((i) =>
						i.responses.some((r) => r.value.toLowerCase().includes(query)),
					),
			)
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [evaluations, search]);

	return (
		<div>
			<Input
				placeholder="Search by candidate or answer..."
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				className="max-w-sm mb-6"
			/>

			{candidates.length === 0 ? (
				<p className="text-muted-foreground text-sm border rounded-lg p-6">
					{evaluations.length === 0
						? "No interviews have been submitted for this cycle yet."
						: "No interviews match your search."}
				</p>
			) : (
				<div className="space-y-3">
					{candidates.map((candidate) => {
						const open = expanded === candidate.email;
						const Chevron = open ? ChevronDown : ChevronRight;
						return (
							<Card key={candidate.email}>
								<CardHeader>
									<button
										type="button"
										aria-expanded={open}
										onClick={() =>
											setExpanded((prev) =>
												prev === candidate.email ? null : candidate.email,
											)
										}
										className="flex w-full items-center gap-3 text-left cursor-pointer"
									>
										<Chevron className="size-5 shrink-0 text-muted-foreground" />
										<Headshot name={candidate.name} size={40} />
										<div className="min-w-0 flex-1">
											<CardTitle className="truncate">
												{candidate.name}
											</CardTitle>
											<p className="text-sm text-muted-foreground truncate">
												{candidate.email}
											</p>
										</div>
										<Badge variant="secondary" className="shrink-0">
											{candidate.interviews.length} interview
											{candidate.interviews.length === 1 ? "" : "s"}
										</Badge>
									</button>
								</CardHeader>

								{open && (
									<CardContent className="space-y-6">
										<Separator />
										{candidate.interviews.map((interview) => (
											<section key={interview._id}>
												<div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
													<h3 className="text-sm font-semibold">
														{interview.evaluatorName}
													</h3>
													<span className="text-xs text-muted-foreground">
														{new Date(interview.submittedAt).toLocaleString()}
													</span>
												</div>
												<div className="space-y-4">
													{interview.responses
														.filter((r) => r.value.trim())
														.map((response) => (
															<div key={response.label}>
																<p className="text-xs font-semibold text-muted-foreground leading-snug mb-1">
																	{response.label}
																</p>
																<p className="text-sm leading-relaxed whitespace-pre-wrap">
																	{response.value}
																</p>
															</div>
														))}
													{interview.responses.every(
														(r) => !r.value.trim(),
													) && (
														<p className="text-sm text-muted-foreground">
															No answers recorded.
														</p>
													)}
												</div>
											</section>
										))}
									</CardContent>
								)}
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}
