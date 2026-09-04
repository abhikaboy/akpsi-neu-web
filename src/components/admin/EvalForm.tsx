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

interface EvalFormProps {
	formType: EvalFormType;
	title: string;
	description: string;
	/** Signed-in brother; used to find their own prior eval to edit. */
	evaluatorEmail: string;
	onSessionExpired: () => void;
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
		Promise.all([
			getEvalCriteria(cycle, formType),
			fetchRushees(cycle),
			fetchEvaluations({ formType, cycle }),
		])
			.then(([nextCriteria, nextRushees, nextExisting]) => {
				setCriteria(nextCriteria);
				setRushees(nextRushees);
				setExisting(nextExisting);
			})
			.catch((err) => handleError(err, "Failed to load the form."))
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
			return;
		}
		const next: Record<string, string> = {};
		for (const criterion of criteria) {
			const response = mine.responses.find((r) => r.label === criterion.label);
			if (response) next[criterion._id] = response.value;
		}
		setValues(next);
	}, [mine, criteria]);

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
		<div className="w-full max-w-2xl">
			<div className="mb-6">
				<div className="flex flex-wrap items-center gap-2 mb-1">
					<h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
					{cycleLabel && <Badge variant="secondary">{cycleLabel}</Badge>}
				</div>
				<p className="text-muted-foreground text-sm">{description}</p>
			</div>

			{(cycleError ?? error) && (
				<div className="p-3 mb-6 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
					{cycleError ?? error}
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Who are you evaluating?</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<Label htmlFor="eval-rushee" className="mb-2 block">
								Rushee
							</Label>
							<Select value={selected} onValueChange={setSelected}>
								<SelectTrigger id="eval-rushee" className="w-full">
									<SelectValue placeholder="Select a rushee" />
								</SelectTrigger>
								<SelectContent>
									{rushees.map((rushee) => (
										<SelectItem key={rushee.email} value={rushee.email}>
											{rushee.name} — {rushee.email}
										</SelectItem>
									))}
									<SelectItem value={NEW_RUSHEE}>
										+ Someone not on this list
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{isNew && (
							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<Label htmlFor="eval-new-name" className="mb-2 block">
										Name
									</Label>
									<Input
										id="eval-new-name"
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
										value={newEmail}
										onChange={(e) => setNewEmail(e.target.value)}
									/>
								</div>
							</div>
						)}

						{mine && (
							<Badge variant="secondary">
								Editing your existing evaluation from{" "}
								{new Date(mine.submittedAt).toLocaleDateString()}
							</Badge>
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
						<CardContent className="space-y-6">
							{criteria.map((criterion) => (
								<div key={criterion._id}>
									<Label
										htmlFor={`criterion-${criterion._id}`}
										className="mb-1 block"
									>
										{criterion.label}
										{criterion.required && (
											<span className="text-destructive"> *</span>
										)}
									</Label>
									{criterion.description && (
										<p className="text-xs text-muted-foreground mb-2">
											{criterion.description}
										</p>
									)}
									<CriterionField
										criterion={criterion}
										value={values[criterion._id] ?? ""}
										onChange={(value) => setValue(criterion._id, value)}
									/>
								</div>
							))}
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
			return (
				<div className="flex flex-wrap gap-2">
					{scoreRange(criterion).map((score) => (
						<button
							key={score}
							type="button"
							onClick={() => onChange(String(score))}
							className={`size-10 rounded-md border text-sm font-medium cursor-pointer transition-colors ${
								value === String(score)
									? "bg-primary text-primary-foreground border-primary"
									: "bg-background hover:bg-accent"
							}`}
						>
							{score}
						</button>
					))}
				</div>
			);
		case "textarea":
			return (
				<Textarea
					id={id}
					rows={4}
					value={value}
					onChange={(e) => onChange(e.target.value)}
				/>
			);
		case "select":
			return (
				<Select value={value} onValueChange={onChange}>
					<SelectTrigger id={id} className="w-full">
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
							onClick={() => onChange(option)}
							className={`px-4 py-2 rounded-md border text-sm font-medium cursor-pointer transition-colors ${
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
					value={value}
					onChange={(e) => onChange(e.target.value)}
				/>
			);
	}
}
