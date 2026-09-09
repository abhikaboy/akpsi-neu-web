import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";
import { useActiveCycle } from "../../lib/activeCycle";
import {
	getEvalCriteria,
	type EvalCriterion,
	type EvalFormType,
} from "../../lib/sanity";
import {
	fetchEvaluations,
	fetchRushees,
	submitEvaluation,
	type EvalResponseValue,
	type EvaluationRecord,
	type Rushee,
} from "../../lib/adminEvals";

const NEW_RUSHEE = "__new__";

interface ExtraQuestion {
	id: string;
	question: string;
	answer: string;
}

let extraQuestionSeq = 0;
function newExtraQuestion(question = "", answer = ""): ExtraQuestion {
	extraQuestionSeq += 1;
	return { id: `extra-${extraQuestionSeq}`, question, answer };
}

interface EvalFormProps {
	formType: EvalFormType;
	title: string;
	/** A single blurb, or several paragraphs of instructions rendered in order. */
	description: string | string[];
	/** Signed-in brother; used to find their own prior eval to edit. */
	evaluatorEmail: string;
	/**
	 * Lets the evaluator append their own question-and-answer pairs. Interviews
	 * go off-script routinely, so those answers need somewhere to live.
	 */
	allowExtraQuestions?: boolean;
	onSessionExpired: () => void;
}

interface CriterionGroup {
	section: string;
	subsections: { subsection: string; criteria: EvalCriterion[] }[];
}

/**
 * Groups criteria into their Sanity-declared sections and sub-sections while
 * preserving the fetched order, so the interview form can render "Core
 * Questions" and "Rotating questions › Professional" as real headings.
 */
function groupCriteria(criteria: EvalCriterion[]): CriterionGroup[] {
	const groups: CriterionGroup[] = [];
	for (const criterion of criteria) {
		const section = criterion.section ?? "";
		const subsection = criterion.subsection ?? "";
		let group = groups.find((g) => g.section === section);
		if (!group) {
			group = { section, subsections: [] };
			groups.push(group);
		}
		let bucket = group.subsections.find((sub) => sub.subsection === subsection);
		if (!bucket) {
			bucket = { subsection, criteria: [] };
			group.subsections.push(bucket);
		}
		bucket.criteria.push(criterion);
	}
	return groups;
}

function scoreRange(criterion: EvalCriterion): number[] {
	const min = typeof criterion.scoreMin === "number" ? criterion.scoreMin : 1;
	const max = typeof criterion.scoreMax === "number" ? criterion.scoreMax : 5;
	if (max <= min) return [min];
	const range: number[] = [];
	for (let v = min; v <= max; v++) range.push(v);
	return range;
}

export default function EvalForm({
	formType,
	title,
	description,
	evaluatorEmail,
	allowExtraQuestions = false,
	onSessionExpired,
}: EvalFormProps) {
	const {
		cycle,
		label: cycleLabel,
		loading: cycleLoading,
		error: cycleError,
	} = useActiveCycle();
	const [criteria, setCriteria] = useState<EvalCriterion[]>([]);
	const [rushees, setRushees] = useState<Rushee[]>([]);
	const [existing, setExisting] = useState<EvaluationRecord[]>([]);
	const [selected, setSelected] = useState("");
	const [newName, setNewName] = useState("");
	const [newEmail, setNewEmail] = useState("");
	const [values, setValues] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// Distinguishes "the rubric fetch failed" from "no criteria are configured",
	// which are very different problems for whoever is reading the screen.
	const [criteriaFailed, setCriteriaFailed] = useState(false);
	const [extraQuestions, setExtraQuestions] = useState<ExtraQuestion[]>([]);

	const handleError = (err: unknown, fallback: string) => {
		if (err instanceof Error && err.message === "unauthenticated") {
			onSessionExpired();
			return;
		}
		setError(err instanceof Error ? err.message : fallback);
	};

	useEffect(() => {
		if (cycleLoading) return;
		if (!cycle) {
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		setValues({});
		setSelected("");
		setCriteriaFailed(false);
		// Settled independently: the rubric comes from Sanity while the roster and
		// prior evals come from our API. One source failing must not blank the
		// others, and a failed rubric fetch must not read as "none configured".
		Promise.allSettled([
			getEvalCriteria(cycle, formType),
			fetchRushees(cycle),
			fetchEvaluations({ formType, cycle }),
		])
			.then(([criteriaResult, rusheeResult, existingResult]) => {
				if (criteriaResult.status === "fulfilled") {
					setCriteria(criteriaResult.value);
				} else {
					setCriteria([]);
					setCriteriaFailed(true);
					handleError(criteriaResult.reason, "Failed to load the rubric.");
				}

				if (rusheeResult.status === "fulfilled") {
					setRushees(rusheeResult.value);
				} else {
					setRushees([]);
					handleError(rusheeResult.reason, "Failed to load the rushee list.");
				}

				if (existingResult.status === "fulfilled") {
					setExisting(existingResult.value);
				} else {
					setExisting([]);
					handleError(
						existingResult.reason,
						"Failed to load existing evaluations.",
					);
				}
			})
			.finally(() => setLoading(false));
	}, [cycle, cycleLoading, formType]);

	const isNew = selected === NEW_RUSHEE;
	const applicant = rushees.find((r) => r.email === selected);
	const applicantName = isNew ? newName : (applicant?.name ?? "");
	const applicantEmail = isNew ? newEmail : (applicant?.email ?? "");

	// Your own prior eval for this person, so re-opening the form edits rather
	// than silently overwriting from blank.
	const mine = useMemo(() => {
		const target = applicantEmail.trim().toLowerCase();
		if (!target) return undefined;
		return existing.find(
			(e) =>
				e.applicantEmail === target &&
				e.evaluatorEmail === evaluatorEmail.trim().toLowerCase(),
		);
	}, [existing, applicantEmail, evaluatorEmail]);

	useEffect(() => {
		if (!mine) {
			setValues({});
			setExtraQuestions([]);
			return;
		}
		const next: Record<string, string> = {};
		for (const criterion of criteria) {
			const response = mine.responses.find((r) => r.label === criterion.label);
			if (response) next[criterion._id] = response.value;
		}
		setValues(next);

		// Anything stored that isn't a current rubric label was an ad-hoc question,
		// so it comes back as one instead of silently disappearing on edit.
		const rubricLabels = new Set(criteria.map((c) => c.label));
		setExtraQuestions(
			mine.responses
				.filter((r) => !rubricLabels.has(r.label))
				.map((r) => newExtraQuestion(r.label, r.value)),
		);
	}, [mine, criteria]);

	const setExtraQuestion = (id: string, patch: Partial<ExtraQuestion>) =>
		setExtraQuestions((prev) =>
			prev.map((q) => (q.id === id ? { ...q, ...patch } : q)),
		);

	const setValue = (id: string, value: string) =>
		setValues((prev) => ({ ...prev, [id]: value }));

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!applicantName.trim() || !applicantEmail.trim()) {
			toast.error("Select a rushee, or enter a name and email.");
			return;
		}
		if (!cycle) {
			toast.error("No active cycle is set.");
			return;
		}
		// A typed answer with no question attached would be unattributable once
		// stored, so it's an error rather than something to quietly drop.
		const orphanAnswer = extraQuestions.find(
			(q) => q.answer.trim() && !q.question.trim(),
		);
		if (orphanAnswer) {
			toast.error("Give your added question a title, or remove it.");
			return;
		}
		const filledExtras = extraQuestions.filter((q) => q.question.trim());
		const clashing = filledExtras.find((q) =>
			criteria.some((c) => c.label === q.question.trim()),
		);
		if (clashing) {
			toast.error(
				`"${clashing.question.trim()}" is already a rubric question — answer it above instead.`,
			);
			return;
		}
		const duplicateExtra = filledExtras.find(
			(q, i) =>
				filledExtras.findIndex(
					(other) => other.question.trim() === q.question.trim(),
				) !== i,
		);
		if (duplicateExtra) {
			toast.error("Two added questions have the same title.");
			return;
		}

		const missing = criteria.find((c) => c.required && !values[c._id]?.trim());
		if (missing) {
			toast.error(`Please complete: ${missing.label}`);
			return;
		}

		const responses: EvalResponseValue[] = criteria.map((criterion) => {
			const raw = values[criterion._id] ?? "";
			const isScore = criterion.fieldType === "score";
			const parsed = Number(raw);
			return {
				label: criterion.label,
				fieldType: criterion.fieldType,
				value: raw,
				score: isScore && raw !== "" && Number.isFinite(parsed) ? parsed : null,
				scoreMin: isScore ? (criterion.scoreMin ?? 1) : null,
				scoreMax: isScore ? (criterion.scoreMax ?? 5) : null,
				weight: criterion.weight ?? 1,
			};
		});

		// Ad-hoc questions store exactly like a long-answer criterion, so the
		// spreadsheet and deliberation views pick them up with no special casing.
		for (const extra of filledExtras) {
			responses.push({
				label: extra.question.trim(),
				fieldType: "textarea",
				value: extra.answer,
				score: null,
				scoreMin: null,
				scoreMax: null,
				weight: 1,
			});
		}

		setSubmitting(true);
		try {
			await submitEvaluation({
				formType,
				cycle,
				applicantName,
				applicantEmail,
				responses,
			});
			toast.success(mine ? "Evaluation updated." : "Evaluation submitted.");
			const refreshed = await fetchEvaluations({ formType, cycle });
			setExisting(refreshed);
			if (isNew) {
				// A brand-new rushee is now on the roster; switch onto their row.
				setRushees(await fetchRushees(cycle));
				setSelected(applicantEmail.trim().toLowerCase());
				setNewName("");
				setNewEmail("");
			}
		} catch (err) {
			if (err instanceof Error && err.message === "unauthenticated") {
				onSessionExpired();
				return;
			}
			toast.error(
				err instanceof Error ? err.message : "Failed to submit evaluation.",
			);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="w-full max-w-2xl mx-auto pb-12">
			<div className="mb-8 sm:mb-10">
				<div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2">
					<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
						{title}
					</h1>
					{cycleLabel && <Badge variant="secondary">{cycleLabel}</Badge>}
				</div>
				<div className="text-muted-foreground text-sm leading-relaxed space-y-2">
					{(Array.isArray(description) ? description : [description]).map(
						(paragraph) => (
							<p key={paragraph}>{paragraph}</p>
						),
					)}
				</div>
			</div>

			{(cycleError ?? error) && (
				<div className="p-4 mb-6 bg-yellow-50 border border-yellow-200 rounded-lg text-sm leading-relaxed text-yellow-800">
					{cycleError ?? error}
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Who are you evaluating?</CardTitle>
					</CardHeader>
					<CardContent className="space-y-5">
						<div>
							<Label htmlFor="eval-rushee" className="mb-2 block">
								Rushee
							</Label>
							<Select value={selected} onValueChange={setSelected}>
								<SelectTrigger id="eval-rushee" className="w-full h-11">
									<SelectValue placeholder="Select a rushee" />
								</SelectTrigger>
								<SelectContent>
									{rushees.map((rushee) => (
										<SelectItem key={rushee.email} value={rushee.email}>
											<span className="flex flex-col items-start sm:flex-row sm:gap-1.5">
												<span>{rushee.name}</span>
												<span className="text-muted-foreground text-xs sm:text-sm">
													{rushee.email}
												</span>
											</span>
										</SelectItem>
									))}
									<SelectItem value={NEW_RUSHEE}>
										+ Someone not on this list
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{isNew && (
							<div className="grid gap-4 sm:grid-cols-2 pt-1">
								<div>
									<Label htmlFor="eval-new-name" className="mb-2 block">
										Name
									</Label>
									<Input
										id="eval-new-name"
										className="h-11"
										value={newName}
										onChange={(e) => setNewName(e.target.value)}
									/>
								</div>
								<div>
									<Label htmlFor="eval-new-email" className="mb-2 block">
										Email
									</Label>
									<Input
										id="eval-new-email"
										type="email"
										className="h-11"
										value={newEmail}
										onChange={(e) => setNewEmail(e.target.value)}
									/>
								</div>
							</div>
						)}

						{mine && (
							<p className="rounded-md bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
								Editing your existing evaluation from{" "}
								{new Date(mine.submittedAt).toLocaleDateString()}
							</p>
						)}
					</CardContent>
				</Card>

				{loading ? (
					<div className="space-y-3">
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className="skeleton h-16 rounded" />
						))}
					</div>
				) : !cycle ? (
					<p className="text-muted-foreground text-sm border rounded-lg p-6">
						No active cycle is set. An admin needs to choose one in Sanity
						Studio under “Chapter Settings”.
					</p>
				) : criteriaFailed ? (
					<p className="text-muted-foreground text-sm border rounded-lg p-6">
						Couldn't load the rubric for this form. Refresh to try again — the
						criteria themselves are fine.
					</p>
				) : criteria.length === 0 ? (
					<p className="text-muted-foreground text-sm border rounded-lg p-6">
						No criteria are configured for this form and cycle yet. Add them in
						Sanity Studio under “Evaluation Criterion”.
					</p>
				) : (
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Rubric</CardTitle>
						</CardHeader>
						<CardContent className="space-y-8">
							{groupCriteria(criteria).map((group) => (
								<section key={group.section || "__ungrouped__"}>
									{group.section && (
										<h3 className="text-sm font-semibold mb-1">
											{group.section}
										</h3>
									)}
									{group.subsections.map((bucket) => (
										<div key={bucket.subsection || "__none__"}>
											{bucket.subsection && (
												<h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-6 mb-1">
													{bucket.subsection}
												</h4>
											)}
											<div className="divide-y divide-border">
												{bucket.criteria.map((criterion) => (
													<div
														key={criterion._id}
														className="py-6 first:pt-4 last:pb-0 sm:py-7 sm:first:pt-5"
													>
														<Label
															htmlFor={`criterion-${criterion._id}`}
															className="mb-2 block text-sm font-medium leading-snug"
														>
															{criterion.label}
															{criterion.required && (
																<span className="text-destructive"> *</span>
															)}
														</Label>
														{criterion.description && (
															<p className="text-xs text-muted-foreground leading-relaxed mb-3">
																{criterion.description}
															</p>
														)}
														<div className="mt-3">
															<CriterionField
																criterion={criterion}
																value={values[criterion._id] ?? ""}
																onChange={(value) =>
																	setValue(criterion._id, value)
																}
															/>
														</div>
													</div>
												))}
											</div>
										</div>
									))}
								</section>
							))}
						</CardContent>
					</Card>
				)}

				{allowExtraQuestions && !loading && cycle && criteria.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Other questions</CardTitle>
							<p className="text-sm text-muted-foreground leading-relaxed">
								Asked something that isn't on the list? Record the question and
								their answer here.
							</p>
						</CardHeader>
						<CardContent className="space-y-6">
							{extraQuestions.length > 0 && (
								<div className="divide-y divide-border">
									{extraQuestions.map((extra, index) => (
										<div
											key={extra.id}
											className="py-6 first:pt-0 last:pb-0 space-y-3"
										>
											<div className="flex items-start justify-between gap-3">
												<Label
													htmlFor={`extra-question-${extra.id}`}
													className="text-sm font-medium"
												>
													Question {index + 1}
												</Label>
												<button
													type="button"
													onClick={() =>
														setExtraQuestions((prev) =>
															prev.filter((q) => q.id !== extra.id),
														)
													}
													className="text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
													aria-label={`Remove question ${index + 1}`}
												>
													<X className="size-4" />
												</button>
											</div>
											<Input
												id={`extra-question-${extra.id}`}
												className="h-11"
												placeholder="What did you ask?"
												value={extra.question}
												onChange={(e) =>
													setExtraQuestion(extra.id, {
														question: e.target.value,
													})
												}
											/>
											<Textarea
												rows={4}
												className="min-h-28 leading-relaxed"
												placeholder="How did they answer?"
												aria-label={`Answer to question ${index + 1}`}
												value={extra.answer}
												onChange={(e) =>
													setExtraQuestion(extra.id, { answer: e.target.value })
												}
											/>
										</div>
									))}
								</div>
							)}

							<Button
								type="button"
								variant="outline"
								onClick={() =>
									setExtraQuestions((prev) => [...prev, newExtraQuestion()])
								}
								className="w-full sm:w-auto"
							>
								<Plus className="size-4" />
								Add question
							</Button>
						</CardContent>
					</Card>
				)}

				<Button
					type="submit"
					disabled={
						submitting ||
						loading ||
						!cycle ||
						criteria.length === 0 ||
						!selected
					}
					size="lg"
					className="w-full sm:w-auto"
				>
					{submitting
						? "Saving..."
						: mine
							? "Update evaluation"
							: "Submit evaluation"}
				</Button>
			</form>
		</div>
	);
}

function CriterionField({
	criterion,
	value,
	onChange,
}: {
	criterion: EvalCriterion;
	value: string;
	onChange: (value: string) => void;
}) {
	const id = `criterion-${criterion._id}`;

	switch (criterion.fieldType) {
		case "score":
			// Buttons stretch to fill the row on a phone (so they stay thumb-sized
			// and wrap instead of shrinking) and settle into fixed squares from sm
			// up. Anchors sit under the ends of the scale, where they read as a
			// range rather than as two stray words.
			return (
				<div>
					<div className="flex flex-wrap gap-2">
						{scoreRange(criterion).map((score) => (
							<button
								key={score}
								type="button"
								aria-pressed={value === String(score)}
								onClick={() => onChange(String(score))}
								className={`h-12 flex-1 basis-11 min-w-11 rounded-md border text-sm font-medium cursor-pointer transition-colors sm:h-11 sm:w-11 sm:flex-none ${
									value === String(score)
										? "bg-primary text-primary-foreground border-primary"
										: "bg-background hover:bg-accent"
								}`}
							>
								{score}
							</button>
						))}
					</div>
					{(criterion.scoreMinLabel || criterion.scoreMaxLabel) && (
						<div className="mt-2 flex justify-between gap-4 text-xs text-muted-foreground">
							<span>{criterion.scoreMinLabel}</span>
							<span>{criterion.scoreMaxLabel}</span>
						</div>
					)}
				</div>
			);
		case "textarea":
			return (
				<Textarea
					id={id}
					rows={5}
					className="min-h-32 leading-relaxed"
					value={value}
					onChange={(e) => onChange(e.target.value)}
				/>
			);
		case "select":
			return (
				<Select value={value} onValueChange={onChange}>
					<SelectTrigger id={id} className="w-full h-11">
						<SelectValue placeholder="Select an option" />
					</SelectTrigger>
					<SelectContent>
						{(criterion.options ?? []).map((option) => (
							<SelectItem key={option} value={option}>
								{option}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			);
		case "boolean":
			return (
				<div className="flex gap-2">
					{["Yes", "No"].map((option) => (
						<button
							key={option}
							type="button"
							aria-pressed={value === option}
							onClick={() => onChange(option)}
							className={`h-12 flex-1 rounded-md border px-4 text-sm font-medium cursor-pointer transition-colors sm:h-11 sm:flex-none sm:min-w-24 ${
								value === option
									? "bg-primary text-primary-foreground border-primary"
									: "bg-background hover:bg-accent"
							}`}
						>
							{option}
						</button>
					))}
				</div>
			);
		default:
			return (
				<Input
					id={id}
					className="h-11"
					value={value}
					onChange={(e) => onChange(e.target.value)}
				/>
			);
	}
}
