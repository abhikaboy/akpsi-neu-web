import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import NameCombobox from "../components/NameCombobox";
import Navigation from "../components/Navigation";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { useActiveCycle } from "../lib/activeCycle";
import { useApplicationEnabled } from "../lib/applicationEnabled";
import { checkApplicationStatus, submitApplication } from "../lib/applications";
import { type Rushee, fetchRushees } from "../lib/rushCheckin";
import {
	type ApplicationQuestion,
	getApplicationQuestions,
} from "../lib/sanity";
import { uploadApplicationFile } from "../lib/uploads";

// Long answers are capped so readers get comparable, skimmable responses.
const LONG_ANSWER_WORD_LIMIT = 150;

/** Applications are limited to school emails, same as the rush check-in. */
const NORTHEASTERN_EMAIL_RE = /^[^\s@]+@northeastern\.edu$/i;

const ALREADY_SUBMITTED_MESSAGE = "You have already submitted an application";

const countWords = (value: string) =>
	value.trim() ? value.trim().split(/\s+/).length : 0;

export const Route = createFileRoute("/application")({
	component: Application,
});

function Application() {
	const {
		cycle,
		label: cycleLabel,
		loading: cycleLoading,
		error: cycleError,
	} = useActiveCycle();
	const { enabled: applicationEnabled, loading: enabledLoading } =
		useApplicationEnabled();
	const [questions, setQuestions] = useState<ApplicationQuestion[]>([]);
	const [answers, setAnswers] = useState<Record<string, string>>({});
	const [rushees, setRushees] = useState<Rushee[]>([]);
	const [name, setName] = useState("");
	const [rusheeId, setRusheeId] = useState("");
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
	const [fileNames, setFileNames] = useState<Record<string, string>>({});
	const [alreadySubmitted, setAlreadySubmitted] = useState(false);
	const [checkingStatus, setCheckingStatus] = useState(false);
	const [confirmation, setConfirmation] = useState<{ name: string } | null>(
		null,
	);

	useEffect(() => {
		fetchRushees()
			.then(setRushees)
			.catch(() => {
				/* the search combo just degrades to a plain name field */
			});
	}, []);

	useEffect(() => {
		if (cycleLoading) return;
		if (!cycle) {
			setLoading(false);
			return;
		}
		setLoading(true);
		setAnswers({});
		getApplicationQuestions(cycle)
			.then(setQuestions)
			.catch(() => setError("Failed to load application questions."))
			.finally(() => setLoading(false));
	}, [cycle, cycleLoading]);

	const setAnswer = (id: string, value: string) =>
		setAnswers((prev) => ({ ...prev, [id]: value }));

	// Checkbox answers ride along in the same string map as every other answer,
	// stored as a comma-separated list so submissions stay one label/value pair.
	const selectedOptions = (id: string) =>
		(answers[id] ?? "").split(", ").filter(Boolean);

	const toggleOption = (id: string, option: string, checked: boolean) => {
		const current = selectedOptions(id);
		const next = checked
			? [...current, option]
			: current.filter((value) => value !== option);
		setAnswer(id, next.join(", "));
	};

	const handleFileChange = async (
		q: ApplicationQuestion,
		file: File | undefined,
	) => {
		if (!file) return;
		setUploadingIds((prev) => new Set(prev).add(q._id));
		try {
			const url = await uploadApplicationFile(file);
			setAnswer(q._id, url);
			setFileNames((prev) => ({ ...prev, [q._id]: file.name }));
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Upload failed.");
		} finally {
			setUploadingIds((prev) => {
				const next = new Set(prev);
				next.delete(q._id);
				return next;
			});
		}
	};

	const checkIfAlreadySubmitted = async (selectedRusheeId: string) => {
		if (!cycle || !selectedRusheeId) {
			setAlreadySubmitted(false);
			return;
		}
		setCheckingStatus(true);
		try {
			const status = await checkApplicationStatus({
				cycle,
				rusheeId: selectedRusheeId,
			});
			setAlreadySubmitted(status.submitted);
		} catch {
			// Don't block the form if the status check fails; the submit endpoint
			// still rejects duplicates server-side.
			setAlreadySubmitted(false);
		} finally {
			setCheckingStatus(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (alreadySubmitted) {
			toast.error(ALREADY_SUBMITTED_MESSAGE);
			return;
		}
		if (!name.trim() || !email.trim()) {
			toast.error("Please enter your name and email.");
			return;
		}
		if (!NORTHEASTERN_EMAIL_RE.test(email.trim())) {
			toast.error("Please use your @northeastern.edu email.");
			return;
		}
		if (uploadingIds.size > 0) {
			toast.error("Please wait for your file(s) to finish uploading.");
			return;
		}
		const missing = questions.find(
			(q) => q.required && !answers[q._id]?.trim(),
		);
		if (missing) {
			toast.error(`Please answer: ${missing.label}`);
			return;
		}
		const tooLong = questions.find(
			(q) =>
				q.fieldType === "textarea" &&
				countWords(answers[q._id] ?? "") > LONG_ANSWER_WORD_LIMIT,
		);
		if (tooLong) {
			toast.error(
				`Please shorten your answer to ${LONG_ANSWER_WORD_LIMIT} words or less: ${tooLong.label}`,
			);
			return;
		}
		setSubmitting(true);
		try {
			if (!cycle) {
				toast.error("Applications are not open right now.");
				return;
			}
			const result = await submitApplication({
				cycle,
				name,
				email,
				answers: questions.map((q) => ({
					label: q.label,
					value: answers[q._id] ?? "",
				})),
				rusheeId: rusheeId || undefined,
			});
			setConfirmation({ name: result.name });
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to submit application.";
			if (message === ALREADY_SUBMITTED_MESSAGE) {
				setAlreadySubmitted(true);
			}
			toast.error(message);
		} finally {
			setSubmitting(false);
		}
	};

	if (confirmation) {
		return (
			<div className="bg-white min-h-screen relative w-full">
				<Navigation currentPage="Apply" mode="dark" />
				<div className="pt-24 sm:pt-28 pb-20 px-6 sm:px-8 flex items-center justify-center">
					<div className="w-full max-w-md text-center">
						<div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-green-100">
							<CheckCircle2
								className="size-11 text-green-600"
								strokeWidth={1.5}
							/>
						</div>
						<h1
							className="text-3xl sm:text-4xl font-black mb-2"
							style={{ fontFamily: "var(--font-avenir-black)" }}
						>
							Application submitted
						</h1>
						<p className="text-muted-foreground mb-1">
							Thanks,{" "}
							<span className="font-semibold text-foreground">
								{confirmation.name}
							</span>
							. We received your application
							{cycleLabel ? ` for ${cycleLabel}` : ""}.
						</p>
						<p className="text-muted-foreground mb-8">
							Keep an eye on your email for next steps. You don&apos;t need to
							submit again.
						</p>
						<Button asChild className="w-full sm:w-auto">
							<Link to="/">Back to home</Link>
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white min-h-screen relative w-full">
			<Navigation currentPage="Apply" mode="dark" />

			<div className="pt-24 sm:pt-28 pb-20 px-6 sm:px-8">
				<div className="max-w-2xl mx-auto">
					<h1
						className="text-3xl sm:text-4xl md:text-5xl font-black mb-2"
						style={{ fontFamily: "var(--font-avenir-black)" }}
					>
						Apply
					</h1>
					<p className="text-muted-foreground mb-8">
						Interested in joining Alpha Kappa Psi? Fill out the form below
						{cycleLabel ? ` to apply for ${cycleLabel}` : ""}.
					</p>

					{(cycleError ?? error) && (
						<div className="p-3 mb-6 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
							{cycleError ?? error}
						</div>
					)}

					{loading || enabledLoading ? (
						<div className="space-y-6">
							{["s1", "s2", "s3"].map((id) => (
								<div key={id} className="skeleton h-16 rounded" />
							))}
						</div>
					) : !applicationEnabled || !cycle || questions.length === 0 ? (
						<p className="text-muted-foreground text-sm border rounded-lg p-6">
							Applications aren't open yet. Check back soon.
						</p>
					) : (
						<form onSubmit={handleSubmit} className="space-y-6">
							<div>
								<Label htmlFor="name" className="mb-2 block">
									Name<span className="text-destructive"> *</span>
								</Label>
								<NameCombobox
									inputId="name"
									people={rushees}
									query={name}
									onQueryChange={(value) => {
										setName(value);
										setRusheeId("");
										setAlreadySubmitted(false);
									}}
									selectedId={rusheeId}
									onSelect={(person) => {
										setRusheeId(person._id);
										setName(person.name);
										void checkIfAlreadySubmitted(person._id);
									}}
									placeholder="Start typing your name..."
									emptyMessage="No matches. That's OK, just keep your typed name above."
								/>
								{checkingStatus && (
									<p className="text-xs text-muted-foreground mt-2">
										Checking previous applications...
									</p>
								)}
								{!checkingStatus && alreadySubmitted && (
									<p className="text-sm text-destructive mt-2">
										{ALREADY_SUBMITTED_MESSAGE}
									</p>
								)}
							</div>
							<div>
								<Label htmlFor="email" className="mb-2 block">
									Email<span className="text-destructive"> *</span>
								</Label>
								<Input
									id="email"
									type="email"
									placeholder="you@northeastern.edu"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
								/>
								<p className="text-xs text-muted-foreground mt-1">
									Use your @northeastern.edu email.
								</p>
							</div>
							{questions.map((q) => (
								<div key={q._id}>
									<Label
										htmlFor={q.fieldType === "checkbox" ? undefined : q._id}
										className="mb-2 block"
									>
										{q.label}
										{q.required && <span className="text-destructive"> *</span>}
									</Label>
									{q.fieldType === "textarea" && (
										<>
											<Textarea
												id={q._id}
												value={answers[q._id] ?? ""}
												onChange={(e) => setAnswer(q._id, e.target.value)}
												rows={5}
												disabled={alreadySubmitted}
											/>
											<p
												className={`text-xs mt-1 ${
													countWords(answers[q._id] ?? "") >
													LONG_ANSWER_WORD_LIMIT
														? "text-destructive"
														: "text-muted-foreground"
												}`}
											>
												{countWords(answers[q._id] ?? "")} /{" "}
												{LONG_ANSWER_WORD_LIMIT} words
											</p>
										</>
									)}
									{q.fieldType === "text" && (
										<Input
											id={q._id}
											value={answers[q._id] ?? ""}
											onChange={(e) => setAnswer(q._id, e.target.value)}
											disabled={alreadySubmitted}
										/>
									)}
									{q.fieldType === "select" && (
										<Select
											value={answers[q._id] ?? ""}
											onValueChange={(v) => setAnswer(q._id, v)}
											disabled={alreadySubmitted}
										>
											<SelectTrigger id={q._id} className="w-full">
												<SelectValue placeholder="Select an option" />
											</SelectTrigger>
											<SelectContent>
												{(q.options ?? []).map((option) => (
													<SelectItem key={option} value={option}>
														{option}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
									{q.fieldType === "checkbox" && (
										<div className="space-y-3">
											{(q.options ?? []).map((option) => {
												const optionId = `${q._id}-${option}`;
												return (
													<div key={option} className="flex items-center gap-3">
														<Checkbox
															id={optionId}
															checked={selectedOptions(q._id).includes(option)}
															onCheckedChange={(checked) =>
																toggleOption(q._id, option, checked === true)
															}
															disabled={alreadySubmitted}
														/>
														<Label htmlFor={optionId} className="font-normal">
															{option}
														</Label>
													</div>
												);
											})}
										</div>
									)}
									{q.fieldType === "file" && (
										<>
											<Input
												id={q._id}
												type="file"
												accept=".pdf,.jpg,.jpeg,.png,.webp"
												disabled={alreadySubmitted || uploadingIds.has(q._id)}
												onChange={(e) =>
													handleFileChange(q, e.target.files?.[0])
												}
											/>
											{uploadingIds.has(q._id) && (
												<div className="skeleton h-4 w-32 rounded mt-2" />
											)}
											{!uploadingIds.has(q._id) && fileNames[q._id] && (
												<p className="text-xs text-muted-foreground mt-1">
													Uploaded: {fileNames[q._id]}
												</p>
											)}
										</>
									)}
								</div>
							))}

							<Button
								type="submit"
								disabled={
									submitting ||
									uploadingIds.size > 0 ||
									alreadySubmitted ||
									checkingStatus
								}
								className="w-full sm:w-auto"
							>
								{submitting
									? "Submitting..."
									: alreadySubmitted
										? "Already submitted"
										: "Submit Application"}
							</Button>
						</form>
					)}
				</div>
			</div>
		</div>
	);
}

export default Application;
