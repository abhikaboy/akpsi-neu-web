import { type ReactNode, useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

const STORAGE_KEY = "akpsi-sheet-password-ok";

interface PasswordGateProps {
	/**
	 * Checked in the browser only, so this keeps the sheet from being opened
	 * over someone's shoulder — it is not real access control. The session
	 * cookie from AdminGate is what actually restricts this page.
	 */
	password: string;
	title: string;
	children: ReactNode;
}

export default function PasswordGate({
	password,
	title,
	children,
}: PasswordGateProps) {
	// Remembered for the tab so navigating away and back doesn't re-prompt.
	const [unlocked, setUnlocked] = useState(
		() => sessionStorage.getItem(STORAGE_KEY) === password,
	);
	const [entry, setEntry] = useState("");
	const [error, setError] = useState<string | null>(null);

	if (unlocked) return <>{children}</>;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (entry.trim().toLowerCase() !== password.toLowerCase()) {
			setError("That password is incorrect.");
			return;
		}
		sessionStorage.setItem(STORAGE_KEY, password);
		setUnlocked(true);
	};

	return (
		<div className="flex justify-center pt-8">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>{title}</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<Label htmlFor="sheet-password" className="mb-2 block">
								Password
							</Label>
							<Input
								id="sheet-password"
								type="password"
								autoFocus
								value={entry}
								onChange={(e) => {
									setEntry(e.target.value);
									setError(null);
								}}
							/>
							{error && (
								<p className="text-destructive text-sm mt-2">{error}</p>
							)}
						</div>
						<Button type="submit" className="w-full">
							Unlock
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
